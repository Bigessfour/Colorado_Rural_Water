"""Operator-facing municipality / first-name helpers."""

from rag.persona import friendly_municipality_name, operator_first_name


def test_friendly_municipality_from_slug():
    assert friendly_municipality_name("town-wiley") == "Town of Wiley"
    assert friendly_municipality_name("city-fort-morgan") == "City of Fort Morgan"
    assert (
        friendly_municipality_name("town-wiley", "Town of Wiley Water")
        == "Town of Wiley Water"
    )


def test_operator_first_name_from_email():
    assert operator_first_name(email="kelly.review@watersaver.local") == "Kelly"
    assert operator_first_name(email="demo.operator@watersaver.local") == "Demo"
    assert operator_first_name(full_name="Steve McKitrick") == "Steve"
    assert operator_first_name() == "there"
