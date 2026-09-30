"""Tests to ensure evaluation pipeline and synthetic simulation are reproducible."""

from eval.run_eval import evaluate


def test_eval_pipeline_executes_cleanly():
    """Verify eval pipeline runs and produces valid non-zero metrics."""
    results = evaluate()
    assert results["cohort_size"] == 30
    assert "metrics" in results
    assert results["metrics"]["difficulty_appropriateness_rate"] > 0.8
    assert results["metrics"]["re_explain_trigger_rate"] >= 0.0
    assert len(results["sample_runs"]) > 0
