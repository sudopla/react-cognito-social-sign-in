#!/usr/bin/env node
import { Stack, StackProps } from 'aws-cdk-lib'
import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { Cognito } from './cognito/cdk'
import { DeploymentPipeline } from './pipeline/cdk'
import { StaticSite } from './react-site/cdk'
import { getAwsAccount, getAwsRegion } from './utils'

// Get AWS account and region
const awsEnv = { account: getAwsAccount(), region: getAwsRegion() }

const app = new cdk.App()
const appName = 'React-App-Social-Login'
const bucketName = `${appName.toLowerCase()}-s3-files-bucket`

// Cognito
class CognitoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    new Cognito(this, 'CognitoUserPool', {
      appName,
      bucketName
    })
  }
}
new CognitoStack(app, `${appName}-CognitoStack`, {
  env: awsEnv,
  description: `${appName} Cognito Stack`
})


// Static Site
class StaticSiteStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    new StaticSite(this, 'StaticSite', {
      appName
    })
  }
}
new StaticSiteStack(app, `${appName}-StaticSiteStack`, {
  env: awsEnv,
  description: `${appName} Static Site Stack`
})


// Deployment Pipeline
class DeployementPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    new DeploymentPipeline(this, 'DeploymentPipeline', {
      awsAccount: awsEnv.account,
      awsRegion: awsEnv.region,
      repoOwner: 'sudopla',
      repoName: 'react-cognito-appsync',
      appName,
      bucketName
    })
  }
}
new DeployementPipelineStack(app, `${appName}-DeploymentPipelineStack`, {
  env: awsEnv,
  description: `${appName} Deployment Pipeline Stack`
})
