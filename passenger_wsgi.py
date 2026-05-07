import os
import sys

# Change working directory so relative paths (and template lookup) work correctly
sys.path.insert(0, os.path.dirname(__file__))

# Import the Flask app object
from app import app as application
