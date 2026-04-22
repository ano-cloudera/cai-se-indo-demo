import unittest

from app.services.visualization_service import VisualizationService


class VisualizationServiceTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.service = VisualizationService()

    def test_builds_line_chart_for_temporal_series(self) -> None:
        spec = self.service.build_visualization(
            question="Show deposit trend by month",
            columns=["month", "total_deposit_balance"],
            rows=[
                {"month": "2026-01", "total_deposit_balance": 100},
                {"month": "2026-02", "total_deposit_balance": 120},
            ],
        )

        self.assertIsNotNone(spec)
        assert spec is not None
        self.assertEqual(spec.type, "line")
        self.assertEqual(spec.x_key, "month")

    def test_builds_bar_chart_for_category_comparison(self) -> None:
        spec = self.service.build_visualization(
            question="Compare outstanding credit by city",
            columns=["city", "total_outstanding_credit"],
            rows=[
                {"city": "Jakarta", "total_outstanding_credit": 1000},
                {"city": "Bandung", "total_outstanding_credit": 800},
            ],
        )

        self.assertIsNotNone(spec)
        assert spec is not None
        self.assertEqual(spec.type, "bar")

    def test_builds_pie_chart_for_small_composition(self) -> None:
        spec = self.service.build_visualization(
            question="Show customer composition by segment",
            columns=["segment", "customer_count"],
            rows=[
                {"segment": "Retail", "customer_count": 10},
                {"segment": "SME", "customer_count": 20},
                {"segment": "Corporate", "customer_count": 5},
            ],
        )

        self.assertIsNotNone(spec)
        assert spec is not None
        self.assertEqual(spec.type, "pie")

    def test_returns_none_for_non_chartable_shape(self) -> None:
        spec = self.service.build_visualization(
            question="Show details",
            columns=["customer_name", "city"],
            rows=[
                {"customer_name": "A", "city": "Jakarta"},
                {"customer_name": "B", "city": "Bandung"},
            ],
        )

        self.assertIsNone(spec)
