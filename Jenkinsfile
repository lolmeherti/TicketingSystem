def testPod = '''
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: jenkins-tester
spec:
  containers:
  - name: dependency-installer
    image: lorisleiva/laravel-docker:8.4
    # We use sleep infinity to keep the pod alive safely
    command: ["sleep", "infinity"]
    resources:
      limits:
        memory: "1Gi"
        cpu: "2000m"
      requests:
        memory: "512Mi"
        cpu: "500m"
    env:
      - name: DB_CONNECTION
        value: mysql
      - name: DB_HOST
        value: 127.0.0.1
      - name: DB_PORT
        value: "3306"
      - name: DB_DATABASE
        value: laravel_testing
      - name: DB_USERNAME
        value: root
      - name: DB_PASSWORD
        value: root
      - name: APP_URL
        value: http://127.0.0.1:8000
      - name: DUSK_DRIVER_URL
        value: http://127.0.0.1:4444/wd/hub
  - name: mysql
    image: mariadb:10.6
    args:
      - "--max_connections=200"
      - "--innodb_buffer_pool_size=64M"
    env:
      - name: MARIADB_ROOT_PASSWORD
        value: root
      - name: MARIADB_DATABASE
        value: laravel_testing
    resources:
      limits:
        memory: "512Mi"
      requests:
        memory: "256Mi"
    ports:
      - containerPort: 3306

  - name: redis
    image: redis:alpine
    ports:
      - containerPort: 6379
    resources:
      limits:
        memory: "256Mi"
        cpu: "500m"
      requests:
        memory: "64Mi"
        cpu: "100m"
  # ----------------------------------
  - name: selenium
    image: selenium/standalone-chromium:latest
    ports:
      - containerPort: 4444
    volumeMounts:
      - name: dshm
        mountPath: /dev/shm
    resources:
      limits:
        memory: "2Gi"
        cpu: "2000m"
      requests:
        memory: "512Mi"
        cpu: "500m"
  volumes:
  - name: dshm
    emptyDir:
      medium: Memory
'''

def buildPod = '''
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: jenkins-builder
spec:
  containers:
  - name: dependency-installer
    image: lorisleiva/laravel-docker:8.4
    # We use sleep infinity to keep the pod alive safely
    command: ["sleep", "infinity"]
    resources:
      limits:
        memory: "1Gi"
        cpu: "2000m"
      requests:
        memory: "512Mi"
        cpu: "500m"
  - name: kaniko
    image: gcr.io/kaniko-project/executor:debug
    command: ["/busybox/cat"]
    tty: true
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
      limits:
        memory: "4Gi"
    volumeMounts:
    - name: docker-config
      mountPath: /kaniko/.docker
  volumes:
  - name: docker-config
    secret:
      secretName: dockerhub-creds
      items:
      - key: .dockerconfigjson
        path: config.json
'''

pipeline {
    agent none

    environment {
        DOCKER_USER = 'deampuleadd'

        IMAGE_TAG = "${env.TAG_NAME ?: env.BUILD_NUMBER}"

        ARGOCD_SERVER = "argocd-server.argocd.svc.cluster.local"
        APP_NAME = "ticketing-system"
        ARGOCD_AUTH_TOKEN = credentials('argocd-token')
    }

    stages {
        stage('Run Tests') {
            agent {
                kubernetes { yaml testPod }
            }
            stages {
                stage('Setup Environment') {
                    steps {
                        checkout scm

                        container('dependency-installer') {
                            sh script: 'git config --global --add safe.directory "*"', label: 'Git Config'
                            sh script: 'cp .env.example .env', label: 'Copy .env'

                            sh script: 'sed -i "s|^APP_URL=.*|APP_URL=http://127.0.0.1:8000|g" .env', label: 'Set APP_URL'
                            sh script: 'sed -i "s|^ASSET_URL=.*|ASSET_URL=http://127.0.0.1:8000|g" .env', label: 'Set ASSET_URL'
                            sh script: 'sed -i "s|^VITE_APP_URL=.*|VITE_APP_URL=http://127.0.0.1:8000|g" .env', label: 'Set VITE_APP_URL'

                            sh script: 'echo "APP_NAME=Laravel" >> .env', label: 'Env: App Name'
                            sh script: 'echo "VITE_APP_NAME=Laravel" >> .env', label: 'Env: Vite Name'
                            sh script: 'echo "REVERB_APP_KEY=dusk-test-key" >> .env', label: 'Env: Reverb Key'
                            sh script: 'echo "REVERB_HOST=127.0.0.1" >> .env', label: 'Env: Reverb Host'
                            sh script: 'echo "REVERB_PORT=8080" >> .env', label: 'Env: Reverb Port'
                            sh script: 'echo "REVERB_SCHEME=http" >> .env', label: 'Env: Reverb Scheme'
                            sh script: 'echo "VITE_REVERB_APP_KEY=dusk-test-key" >> .env', label: 'Env: Vite Reverb Key'
                            sh script: 'echo "VITE_REVERB_HOST=127.0.0.1" >> .env', label: 'Env: Vite Reverb Host'
                            sh script: 'echo "VITE_REVERB_PORT=8080" >> .env', label: 'Env: Vite Reverb Port'
                            sh script: 'echo "VITE_REVERB_SCHEME=http" >> .env', label: 'Env: Vite Reverb Scheme'

                            sh script: 'sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=mysql/" .env', label: 'Env: DB Connection'
                            sh script: 'sed -i "s/^# DB_HOST=.*/DB_HOST=127.0.0.1/" .env', label: 'Env: DB Host'
                            sh script: 'sed -i "s/^# DB_PORT=.*/DB_PORT=3306/" .env', label: 'Env: DB Port'
                            sh script: 'sed -i "s/^# DB_DATABASE=.*/DB_DATABASE=laravel_testing/" .env', label: 'Env: DB Name'
                            sh script: 'sed -i "s/^# DB_USERNAME=.*/DB_USERNAME=root/" .env', label: 'Env: DB User'
                            sh script: 'sed -i "s/^# DB_PASSWORD=.*/DB_PASSWORD=root/" .env', label: 'Env: DB Password'

                            sh script: 'sed -i "s|^REDIS_HOST=.*|REDIS_HOST=127.0.0.1|g" .env', label: 'Env: Redis Host'
                            sh script: 'sed -i "s|^REDIS_PORT=.*|REDIS_PORT=6379|g" .env', label: 'Env: Redis Port'
                            sh script: 'sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=null|g" .env', label: 'Env: Redis Password'

                            sh script: 'echo "DEBUGBAR_ENABLED=false" >> .env', label: 'Env: Disable Debugbar'
                            sh script: 'echo "APP_DEBUG=false" >> .env', label: 'Env: Disable Debug'
                            sh script: 'echo "LOG_CHANNEL=single" >> .env', label: 'Env: Log Channel'

                            sh script: 'chmod -R 777 public', label: 'Perms: Public'
                            sh script: 'chmod -R 777 storage bootstrap/cache', label: 'Perms: Storage'
                            sh script: 'touch storage/logs/laravel.log && chmod 777 storage/logs/laravel.log', label: 'Perms: Log File'
                        }
                    }
                }

                stage('Install Backend') {
                    steps {
                        container('dependency-installer') {
                            sh script: 'composer install --no-interaction --prefer-dist', label: 'Composer Install'
                            sh script: 'php artisan config:clear', label: 'Config Clear'
                        }
                    }
                }

                stage('Install Frontend') {
                    steps {
                        container('dependency-installer') {
                            sh script: 'npm install', label: 'NPM Install'
                            sh script: 'npm run build', label: 'Vite Build'
                            sh script: 'chmod -R 777 public/build', label: 'Perms: Build Folder'
                        }
                    }
                }

                stage('Unit Tests') {
                    steps {
                        container('dependency-installer') {
                            sh script: 'php artisan key:generate', label: 'Key Gen'
                            sh script: 'php artisan migrate --force', label: 'DB Migrate'
                            sh script: 'php artisan test', label: 'Run PHPUnit'
                        }
                    }
                }

                stage('Dusk Tests') {
                    steps {
                        container('dependency-installer') {
                            sh script: 'APP_URL=http://127.0.0.1:8000 php artisan serve --host=0.0.0.0 --port=8000 > serve.log 2>&1 &', label: 'Start Server'
                            sh script: 'sleep 10', label: 'Wait for Server'
                            sh script: 'sed -i "s/<phpunit/<phpunit failOnWarning=\\"false\\"/g" phpunit.xml', label: 'Config: Ignore Warnings'
                            sh script: 'vendor/bin/phpunit tests/Browser', label: 'Run Dusk Tests'
                        }
                    }
                }
            }
        }

        stage('Build Base') {
            agent {
                kubernetes { yaml buildPod }
            }
            steps {
                checkout scm

                container('kaniko') {
                    echo "Building Base with tag: ${IMAGE_TAG}"
                    sh script: """
                    /kaniko/executor --context `pwd` \
                        --dockerfile `pwd`/buildDeployFiles/base/Dockerfile \
                        --cache=false \
                        --compressed-caching=false \
                        --single-snapshot \
                        --destination ${DOCKER_USER}/${APP_NAME}-base:${IMAGE_TAG}
                    """
                }
            }
        }
    }
}
