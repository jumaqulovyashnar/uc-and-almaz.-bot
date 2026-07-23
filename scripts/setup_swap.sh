#!/bin/bash
# ==============================================================================
# CyberPay / Donate Bot — 2GB Swap Memory Creation Script for 1GB RAM Servers
# Prevent Linux OOM-killer (Out Of Memory) crashes during peak traffic
# ==============================================================================

set -e

echo "🚀 Starting 2GB Swap memory creation..."

# Check if swap file already exists
if [ -f /swapfile ]; then
    echo "⚠️ /swapfile already exists. Skipping allocation."
    free -h
    exit 0
fi

# Allocate 2GB swap space
echo "📦 Allocating 2GB swap space..."
sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048

# Restrict permissions
echo "🔒 Setting secure permissions (chmod 600)..."
sudo chmod 600 /swapfile

# Set up Linux swap area
echo "⚙️ Setting up swap area (mkswap)..."
sudo mkswap /swapfile

# Enable swap file
echo "⚡ Enabling swap file (swapon)..."
sudo swapon /swapfile

# Add to /etc/fstab for persistence across reboots
if ! grep -q '/swapfile' /etc/fstab; then
    echo "📌 Persisting swap in /etc/fstab..."
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "✅ 2GB Swap memory successfully created and enabled!"
echo "Current Memory & Swap Status:"
free -h
