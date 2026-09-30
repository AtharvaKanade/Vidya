"""Pytest configuration for Vidya tests."""

import os
import pytest

# Force isolated local SQLite database for tests to prevent remote DB calls
os.environ["DATABASE_URL"] = ""
os.environ["GEMINI_API_KEY"] = "mock_key_for_testing"
