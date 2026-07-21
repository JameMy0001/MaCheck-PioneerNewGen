-- Supabase Migration: 202607210002_agent_operational_functions.sql
-- Description: Add Subscription Tier columns, RPC quota checker with Admin override, and Admin management RPCs for AI Care Agent.

BEGIN;

---------------------------------------------------------
1. PROFILE SUBSCRIPTION COLUMNS
---------------------------------------------------------

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'family', 'admin')),
ADD COLUMN IF NOT EXISTS custom_quota_override INT DEFAULT NULL;

---------------------------------------------------------
2. CHECK USER AGENT QUOTA RPC
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_user_agent_quota(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    allowed BOOLEAN,
    quota_remaining INT,
    current_tier TEXT,
    runs_this_week INT,
    max_weekly_quota INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
    v_tier TEXT;
    v_override INT;
    v_runs_count INT;
    v_max_quota INT;
    v_remaining INT;
BEGIN
    -- 1. Fetch user role and subscription tier
    SELECT role, COALESCE(subscription_tier, 'free'), custom_quota_override
    INTO v_role, v_tier, v_override
    FROM profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        v_role := 'user';
        v_tier := 'free';
        v_override := NULL;
    END IF;

    -- 2. Count runs in the last 7 days
    SELECT COUNT(*)::INT INTO v_runs_count
    FROM agent_runs
    WHERE user_id = p_user_id
      AND created_at >= (now() - INTERVAL '7 days');

    -- 3. Check for Admin role or Admin tier -> Unlimited access
    IF v_role = 'admin' OR v_tier = 'admin' THEN
        RETURN QUERY SELECT true, 9999, 'admin'::TEXT, v_runs_count, 9999;
        RETURN;
    END IF;

    -- 4. Calculate max quota
    IF v_override IS NOT NULL THEN
        v_max_quota := v_override;
    ELSIF v_tier = 'pro' THEN
        v_max_quota := 50;
    ELSIF v_tier = 'family' THEN
        v_max_quota := 200;
    ELSE
        v_max_quota := 7; -- Free Tier: 7 runs per week
    END IF;

    -- 5. Calculate remaining
    v_remaining := v_max_quota - v_runs_count;

    IF v_remaining > 0 THEN
        RETURN QUERY SELECT true, v_remaining, v_tier, v_runs_count, v_max_quota;
    ELSE
        RETURN QUERY SELECT false, 0, v_tier, v_runs_count, v_max_quota;
    END IF;
END;
$$;

---------------------------------------------------------
3. ADMIN MANAGE USER SUBSCRIPTION RPC
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_update_user_subscription(
    p_target_user_id UUID,
    p_new_tier TEXT,
    p_quota_override INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    -- Verify caller is admin
    SELECT role INTO v_caller_role
    FROM profiles
    WHERE id = auth.uid();

    IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not an admin';
    END IF;

    -- Validate tier
    IF p_new_tier NOT IN ('free', 'pro', 'family', 'admin') THEN
        RAISE EXCEPTION 'Invalid tier. Must be free, pro, family, or admin';
    END IF;

    -- Update target profile
    UPDATE profiles
    SET subscription_tier = p_new_tier,
        custom_quota_override = p_quota_override,
        updated_at = now()
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_target_user_id,
        'subscription_tier', p_new_tier,
        'custom_quota_override', p_quota_override
    );
END;
$$;

---------------------------------------------------------
4. GRANTS
---------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.check_user_agent_quota(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user_subscription(UUID, TEXT, INT) TO authenticated, service_role;

COMMIT;
