from unittest.mock import MagicMock, patch
import pandas as pd
from src.analysis.analyst import generate_weekly_report


def test_generate_report_no_data(caplog):
    """Verify that empty data results in a warning log."""
    # analyst loads data via _load_data() (CSV-preferred, SQLite fallback).
    # Patch that seam directly so the test is independent of the data source.
    with patch("src.analysis.analyst._load_data", return_value=pd.DataFrame()):
        generate_weekly_report(output_dir="/tmp")
    assert "No audit log found" in caplog.text


@patch("src.analysis.analyst.OpenAI")
def test_generate_report_success(mock_openai_class):
    """Verify report generation with mocked data source and OpenAI."""
    # 1. Mock the OpenAI client + completion
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client
    mock_completion = MagicMock()
    mock_completion.choices[0].message.content = "Mocked Report Content"
    mock_client.chat.completions.create.return_value = mock_completion

    # 2. Provide a minimal-but-valid audit frame (model / verdict / prompt_id are
    #    the only columns the stats pipeline requires; two models with a
    #    disagreement exercise the kappa + pivot paths).
    df = pd.DataFrame(
        [
            {"model": "gpt-4", "verdict": "ALLOWED", "prompt_id": "p1"},
            {"model": "gpt-4", "verdict": "REMOVED", "prompt_id": "p2"},
            {"model": "claude-3", "verdict": "ALLOWED", "prompt_id": "p1"},
            {"model": "claude-3", "verdict": "ALLOWED", "prompt_id": "p2"},
        ]
    )

    # 3. Run
    with patch("src.analysis.analyst._load_data", return_value=df):
        generate_weekly_report(output_dir="/tmp", report_file="test_report.md")

    # 4. Verify — analyst prepends a metadata comment; check content is present
    with open("/tmp/test_report.md", "r") as f:
        content = f.read()
        assert "Mocked Report Content" in content

    # Verify OpenAI was called
    mock_client.chat.completions.create.assert_called_once()
