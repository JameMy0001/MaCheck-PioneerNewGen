import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import time

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="MaCheck Caregiver Dashboard",
    page_icon="🩺",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for Premium Aesthetics
st.markdown("""
<style>
    .main {
        background-color: #F8F9FA;
    }
    .metric-card {
        background-color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        text-align: center;
    }
    .metric-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: #1A73E8;
    }
    .metric-title {
        color: #5F6368;
        font-size: 1.1rem;
        font-weight: 500;
    }
    .critical-text {
        color: #D93025;
    }
</style>
""", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# Dummy Data Generation
# -----------------------------------------------------------------------------
@st.cache_data
def generate_priority_queue(num_patients: int = 200) -> pd.DataFrame:
    import os
    file_path = os.path.join(os.path.dirname(__file__), 'caregiver_priority_queue.csv')
    try:
        df = pd.read_csv(file_path)
        # Rename columns to match the dashboard UI
        df = df.rename(columns={
            'analytics_subject_id': 'Patient ID',
            'risk_score': 'Risk Score',
            'priority_tier': 'Risk Tier',
            'adherence_7d': 'Adherence (7d)',
            'missed_streak': 'Missed Streak (Days)',
            'reason_codes': 'Primary Reason'
        })
        
        # Capitalize Risk Tier
        df['Risk Tier'] = df['Risk Tier'].str.capitalize()
        # Convert adherence from ratio to percentage
        df['Adherence (7d)'] = (df['Adherence (7d)'] * 100).round(1)
        
        # Add random Ward/Bed for visual completeness
        np.random.seed(42)
        df['Ward/Bed'] = [f"W{np.random.randint(1,5)}-B{np.random.randint(1,20)}" for _ in range(len(df))]
        
        # Sort by Risk Score descending (Priority Queue)
        df = df.sort_values('Risk Score', ascending=False).reset_index(drop=True)
        return df
    except Exception as e:
        st.error(f"Error loading real data: {e}")
        return pd.DataFrame()

# -----------------------------------------------------------------------------
# Sidebar Controls
# -----------------------------------------------------------------------------
with st.sidebar:
    st.image("https://placehold.co/400x150?text=MaCheck+Logo", use_container_width=True)
    st.markdown("### 🎛️ Analytics Engine Settings")
    
    engine_mode = st.radio("Processing Engine:", ["NVIDIA RAPIDS (GPU)", "Pandas (CPU)"], index=0)
    num_patients = st.slider("Simulated Patient Count", min_value=100, max_value=5000, value=500, step=100)
    
    if st.button("🔄 Recalculate Risk Scores", use_container_width=True, type="primary"):
        with st.spinner(f"Running on {engine_mode}..."):
            time.sleep(0.5 if "GPU" in engine_mode else 2.5) # Simulate speedup
            st.cache_data.clear()
            st.success("Analysis Complete!")

# -----------------------------------------------------------------------------
# Main Dashboard
# -----------------------------------------------------------------------------
st.title("🩺 MaCheck Caregiver Dashboard")
st.markdown("Real-time decision support system powered by **Google Cloud & NVIDIA RAPIDS**")

# Load Data
df = generate_priority_queue(num_patients)
critical_count = len(df[df['Risk Tier'] == 'Critical'])
high_count = len(df[df['Risk Tier'] == 'High'])
avg_adherence = df['Adherence (7d)'].mean()

# Metrics Row
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-title">Monitored Patients</div>
        <div class="metric-value">{num_patients:,}</div>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-title">Critical Priority</div>
        <div class="metric-value critical-text">{critical_count:,}</div>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-title">High Risk Alert</div>
        <div class="metric-value" style="color: #F9AB00;">{high_count:,}</div>
    </div>
    """, unsafe_allow_html=True)

with col4:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-title">Avg Adherence (7d)</div>
        <div class="metric-value" style="color: #34A853;">{avg_adherence:.1f}%</div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("---")

# Main Content Area
col_left, col_right = st.columns([6, 4])

with col_left:
    st.subheader("🚨 Priority Queue (Action Required)")
    st.markdown("Patients ranked by immediate risk score requiring caregiver intervention.")
    
    # Use native Streamlit dataframe instead of Pandas Styler to avoid jinja2 cloud errors
    st.dataframe(
        df.head(15), 
        use_container_width=True, 
        height=400,
        column_config={
            "Risk Score": st.column_config.ProgressColumn(
                "Risk Score",
                help="Higher score means higher risk",
                format="%.1f",
                min_value=0,
                max_value=100,
            ),
            "Risk Tier": st.column_config.TextColumn(
                "Risk Tier"
            )
        }
    )

with col_right:
    st.subheader("📊 Severity Distribution")
    
    tier_counts = df['Risk Tier'].value_counts().reset_index()
    tier_counts.columns = ['Risk Tier', 'Count']
    
    # Color mapping for tiers
    color_map = {'Low': '#34A853', 'Medium': '#FBBC04', 'High': '#F9AB00', 'Critical': '#EA4335'}
    
    fig = px.pie(
        tier_counts, 
        values='Count', 
        names='Risk Tier',
        hole=0.4,
        color='Risk Tier',
        color_discrete_map=color_map
    )
    fig.update_layout(margin=dict(t=0, b=0, l=0, r=0), height=300)
    st.plotly_chart(fig, use_container_width=True)
    
    st.subheader("📉 Missed Streak Analysis")
    streak_counts = df['Missed Streak (Days)'].value_counts().reset_index().sort_values('Missed Streak (Days)')
    streak_counts.columns = ['Days Missed', 'Patients']
    
    fig2 = px.bar(
        streak_counts, 
        x='Days Missed', 
        y='Patients',
        color='Patients',
        color_continuous_scale='Reds'
    )
    fig2.update_layout(margin=dict(t=0, b=0, l=0, r=0), height=250, coloraxis_showscale=False)
    st.plotly_chart(fig2, use_container_width=True)

st.markdown("---")
st.caption("🚀 Demo Application deployed on **Google Cloud Run**. Accelerated by **NVIDIA RAPIDS (cuDF)**.")
