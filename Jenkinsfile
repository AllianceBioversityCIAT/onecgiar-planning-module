pipeline {
  agent any
  stages {
    stage('verify tooling') {
      steps {
        slackSend color: 'black', message: 'planning build process is started'
        sh '''
          docker version
          docker info
          docker compose version
          curl --version
          jq --version
        '''
      }
    }
    stage('Clean up') {
      steps {
        sh 'docker system prune -a -f'
      }
    }
    stage('Start container') {
      steps {
        sh 'docker compose up -d --no-color --build --wait'
        sh 'docker compose ps'
      }
    }
  }
  post {
    always {
      slackSend color: 'black', message: 'planning build process is finished'
    }
    success {
      slackSend color: 'good', message: 'planning build process is done successfully!'
    }
    failure {
      slackSend color: 'bad', message: 'planning build process is done with failure'
    }
  }
}
