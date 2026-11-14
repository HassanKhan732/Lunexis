import os

from src.config import APP_ENV, APP_NAME
from src.api import create_app
from src.services.bootstrap import bootstrap_application
from src.services.logger import configure_logger

LOGGER = configure_logger(APP_NAME)


def main() -> None:
    payload = bootstrap_application()
    LOGGER.info("Application initialized: %s", payload)
    LOGGER.info("Starting %s in %s mode", APP_NAME, APP_ENV)
    create_app().run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")))


if __name__ == "__main__":
    main()
