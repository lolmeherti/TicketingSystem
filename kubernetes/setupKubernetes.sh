#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Helper Function: Cleanup ---
# Deletes all resources defined in the YAML files, in the correct reverse order.
# The "--ignore-not-found=true" flag prevents errors if a resource doesn't exist yet.
cleanup_resources() {
    echo "======================================================="
    echo "🔥 --recreate flag detected. Deleting existing resources..."
    echo "🔥 WARNING: This will delete any data in the volumes."
    echo "======================================================="
    echo ""

    # 1. Delete in reverse order of creation
    echo "--- Deleting CronJobs ---"
    kubectl delete -f cronjobs/ --ignore-not-found=true
    echo "--- Deleting Ingress ---"
    kubectl delete -f ingress.yaml --ignore-not-found=true
    echo "--- Deleting Services ---"
    kubectl delete -f services/ --ignore-not-found=true
    echo "--- Deleting Deployments ---"
    kubectl delete -f deployments/ --ignore-not-found=true
    echo "--- Deleting StatefulSets ---"
    kubectl delete -f statefulsets/ --ignore-not-found=true
    echo "--- Deleting ConfigMaps ---"
    kubectl delete -f configMaps/ --ignore-not-found=true
    echo "--- Deleting SealedSecrets ---"
    kubectl delete -f sealedSecrets/ --ignore-not-found=true
    echo "--- Deleting Secrets ---"
    # We must manually delete the secret created by the SealedSecret controller
    kubectl delete secret sealed-env-secret --ignore-not-found=true
    kubectl delete -f secrets/ --ignore-not-found=true
    echo "--- Deleting PersistentVolumeClaims ---"
    kubectl delete -f persistentVolumeClaims/ --ignore-not-found=true
    
    # Wait a moment for PVCs to detach before deleting PVs
    echo "Waiting 5 seconds for volumes to detach..."
    sleep 5

    echo "--- Deleting PersistentVolumes ---"
    kubectl delete -f persistentVolumes/ --ignore-not-found=true

    echo ""
    echo "✅ Cleanup complete. Proceeding with deployment."
    echo "-------------------------------------------------------"
    echo ""
}


# --- Helper Function: Apply ---
apply_files_in_dir() {
    local dir_path="$1"
    if [ ! -d "$dir_path" ]; then
        echo "Directory '$dir_path' not found, skipping."
        return
    fi

    echo "--- Applying files in $dir_path ---"
    # Using "kubectl apply -f <directory>" is more efficient
    kubectl apply -f "$dir_path"
    echo ""
}

# --- Main Deployment Logic ---

# Check for the --recreate flag
if [[ "$1" == "--recreate" ]]; then
    cleanup_resources
fi

echo "🚀 Starting Kubernetes deployment..."

# 1. Storage
apply_files_in_dir "persistentVolumes"
apply_files_in_dir "persistentVolumeClaims"

# 2. Configuration and Secrets
apply_files_in_dir "secrets"
apply_files_in_dir "sealedSecrets"
apply_files_in_dir "configMaps"

# 3. Workloads
apply_files_in_dir "statefulsets"
apply_files_in_dir "deployments"

# 4. Networking
apply_files_in_dir "services"

# 5. Ingress
echo "--- Applying Ingress ---"
if [ -f "ingress.yaml" ]; then
    kubectl apply -f "ingress.yaml"
    echo ""
else
    echo "ingress.yaml not found, skipping."
    echo ""
fi

# 6. CronJobs
apply_files_in_dir "cronjobs"


echo "-------------------------------------------------------"
echo "✅ All Kubernetes YAML files have been applied successfully."