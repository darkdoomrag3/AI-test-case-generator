from __future__ import annotations

from app.features import FEATURE_NAMES, extract_features, feature_vector


def test_feature_vector_length_matches_names(good_case):
    assert len(feature_vector(good_case)) == len(FEATURE_NAMES)


def test_good_case_features(good_case):
    feats = extract_features(good_case)
    assert feats["step_count"] == 3.0
    assert feats["steps_with_expected_ratio"] == 1.0
    assert feats["has_expected_result"] == 1.0
    assert feats["has_preconditions"] == 1.0
    assert feats["requirement_ref_count"] == 2.0
    assert feats["has_priority"] == 1.0


def test_weak_case_features(weak_case):
    feats = extract_features(weak_case)
    assert feats["step_count"] == 0.0
    assert feats["steps_with_expected_ratio"] == 0.0
    assert feats["has_expected_result"] == 0.0
    assert feats["requirement_ref_count"] == 0.0


def test_extract_features_tolerates_garbage():
    feats = extract_features({"steps": "not-a-list", "requirementRefs": None})
    assert feats["step_count"] == 0.0
    assert feats["requirement_ref_count"] == 0.0
