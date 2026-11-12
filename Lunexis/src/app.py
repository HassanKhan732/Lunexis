from src.config import APP_ENV, APP_NAME
from src.services.bootstrap import bootstrap_application
from src.services.logger import configure_logger

LOGGER = configure_logger(APP_NAME)


def main() -> None:
    payload = bootstrap_application()
    LOGGER.info("Application initialized: %s", payload)
    print(f"{APP_NAME} is running in {APP_ENV} mode")


if __name__ == "__main__":
    main()
