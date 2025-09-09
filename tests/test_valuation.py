from magsuite.valuation import Batch, fifo, lifo, weighted_average, ValuationConfig
import pytest


def sample_batches():
    return [Batch(10, 2.0), Batch(5, 3.0), Batch(8, 4.0)]


def test_fifo():
    batches = sample_batches()
    assert fifo(batches, 12) == pytest.approx(10 * 2.0 + 2 * 3.0)


def test_lifo():
    batches = sample_batches()
    assert lifo(batches, 12) == pytest.approx(8 * 4.0 + 4 * 3.0)


def test_weighted_average():
    batches = sample_batches()
    total_qty = sum(b.quantity for b in batches)
    total_cost = sum(b.quantity * b.unit_cost for b in batches)
    expected = 12 * (total_cost / total_qty)
    assert weighted_average(batches, 12) == pytest.approx(expected)


def test_config():
    cfg = ValuationConfig(company_methods={"acme": "lifo"}, warehouse_methods={"A": "weighted_average"})
    assert cfg.get_method(company="acme", warehouse="B") == "lifo"
    assert cfg.get_method(company="foo", warehouse="A") == "weighted_average"
    assert cfg.get_method(company="foo", warehouse="C") == "fifo"
