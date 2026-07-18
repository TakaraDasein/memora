try:
    from importlib.metadata import version, PackageNotFoundError
    try:
        __version__ = version("memora-mcp")
    except PackageNotFoundError:
        __version__ = "unknown"
except ImportError:
    __version__ = "unknown"

from ._cli import main

__all__ = ["main", "__version__"]
