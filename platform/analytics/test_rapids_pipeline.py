import pytest
import time
from rapids_pipeline import (
    generate_synthetic_adherence_dataset,
    compute_patient_risk_scores_python,
    compute_reason_codes,
    run_cpu_vs_gpu_benchmark
)

def test_generate_synthetic_adherence_dataset():
    dataset = generate_synthetic_adherence_dataset(num_patients=10, days=7)
    assert len(dataset) > 0, "Dataset should not be empty"
    assert "idempotency_key" in dataset[0], "Missing idempotency_key"
    assert "medication_code" in dataset[0], "Missing medication_code"
    
def test_compute_reason_codes():
    codes = compute_reason_codes(
        missed_streak=3, 
        adherence_7d=0.65, 
        late_rate_7d=0.25, 
        severe_interaction=True, 
        worsening_trend=True
    )
    assert "MISSED_STREAK_3" in codes
    assert "ADHERENCE_7D_BELOW_0_70" in codes
    assert "LATE_DOSE_RATE_HIGH" in codes
    assert "SEVERE_INTERACTION_REVIEW" in codes
    assert "WORSENING_TREND" in codes

def test_compute_patient_risk_scores_python():
    dataset = generate_synthetic_adherence_dataset(num_patients=5, days=7)
    results, checksum = compute_patient_risk_scores_python(dataset)
    
    assert len(results) > 0, "Should return results"
    assert "risk_score" in results[0], "Result should contain risk_score"
    assert "priority_tier" in results[0], "Result should contain priority_tier"
    assert len(checksum) == 64, "Checksum should be valid SHA-256"

def test_run_cpu_vs_gpu_benchmark():
    benchmark_data = run_cpu_vs_gpu_benchmark(num_patients=50)
    assert benchmark_data["total_patients_analyzed"] == 50
    assert "cpu_wall_time_ms" in benchmark_data
    assert "gpu_wall_time_ms" in benchmark_data
    assert benchmark_data["checksum_match"] is True
