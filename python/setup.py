from setuptools import setup, find_packages

setup(
    name="image-ml",
    version="0.1.0",
    description="Python bindings for Rust image processing pipeline with ML integration",
    author="Image Processing Pipeline",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "numpy>=1.20",
        "Pillow>=9.0",
    ],
    extras_require={
        "pytorch": [
            "torch>=2.0",
            "torchvision>=0.15",
        ],
        "tensorflow": [
            "tensorflow>=2.10",
        ],
        "dev": [
            "pytest>=7.0",
            "pytest-cov>=4.0",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
)
