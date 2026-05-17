import pytest
import os
import sys

# Add src to path so we can import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


@pytest.fixture(scope="function")
def db_session():
    """
    Creates a fresh in-memory database for each test.
    Imports are deferred so pytest collection works without sqlalchemy installed.
    """
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from src.database import Base, ModelRegistry, Prompt, AuditResult
    except ImportError:
        pytest.skip("sqlalchemy not installed — skipping DB fixture tests")
        return

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    yield session

    session.close()
