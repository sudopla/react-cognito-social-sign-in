import { IdentityPool, UserPoolAuthenticationProvider, IdentityPoolProviderUrl } from '@aws-cdk/aws-cognito-identitypool-alpha'
import {
  aws_cognito as cognito,
  aws_ssm as ssm,
  Duration,
  aws_iam as iam,
  Stack
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as perms from './iam_perms'

export interface CognitoProps {
  appName: string,
  bucketName: string
}

export class Cognito extends Construct {
  constructor(scope: Construct, id: string, props: CognitoProps) {
    super(scope, id)

    const awsRegion = Stack.of(this).region
    const awsAccount = Stack.of(this).account

    /**
     * Cognito User Pool and groups
     */
    const userPool = new cognito.UserPool(this, 'CognitoUserPool', {
      userPoolName: `${props.appName}-userPool`,
      signInAliases: { email: true }, // how users will sign in. Cannot be changed after creation
      signInCaseSensitive: false, // case insensitive is preferred in most situations
      standardAttributes: {
        email: {
          required: true
        }
      },
      passwordPolicy: {
        // all requirements are enabled by default
        minLength: 8,
        tempPasswordValidity: Duration.days(5)
      },
      selfSignUpEnabled: true, // Allow user to sign up
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { sms: true, otp: true },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      email: cognito.UserPoolEmail.withCognito(), // Don't use SES for now
      userInvitation: { // Email template for users created by admin
        emailSubject: 'Invite to join our awesome app!',
        emailBody:
          'Hello {username}, you have been invited to join our awesome app! Your temporary password is {####}',
        smsMessage: 'Hello {username}, your temporary password for our awesome app is {####}'
      },
      userVerification: { // Email template for users signing themselves up
        emailSubject: 'Verify your email for awesome app!',
        emailBody: 'Thanks for signing up to our app! Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
        smsMessage: 'Thanks for signing up to our awesome app! Your verification code is {####}'
      },
      deviceTracking: {
        challengeRequiredOnNewDevice: false,
        deviceOnlyRememberedOnUserPrompt: false
      }
    })
    // Add domain - this is required for social sign in. This will enable hosted UI endpoints
    userPool.addDomain('domain', {
      cognitoDomain: {
        domainPrefix: props.appName.toLocaleLowerCase()
      }
    })

    // Add Facebook Identity Provider to User Pool
    new cognito.UserPoolIdentityProviderFacebook(this, 'FacebookIdP', {
      clientId: '901807381131417',
      clientSecret: process.env.FACEBOOK_APP_SECRET || '',
      userPool,
      // the properties below are optional
      attributeMapping: {
        email: cognito.ProviderAttribute.FACEBOOK_EMAIL,
        givenName: cognito.ProviderAttribute.FACEBOOK_NAME,
        familyName: cognito.ProviderAttribute.FACEBOOK_LAST_NAME
      },
      scopes: ['public_profile', 'email'], // https://developers.facebook.com/docs/permissions/reference
      apiVersion: 'v15.0' // !important, cdk was not specifying any version by default and login failed
    })

    // Add Google Identity Provider to User Pool
    new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleIdP', {
      clientId: '142517483005-a430cqu9au7g9n5kodafojo3mdae7l5t.apps.googleusercontent.com',
      clientSecret: process.env.GOOGLE_APP_SECRET,
      userPool,
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
        familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME
      },
      scopes: ['profile email openid']
    })

    // Add new app client to user pool
    const userPoolClient = userPool.addClient('ReactClient', {
      authFlows: {
        userSrp: true
      },
      // URLs allowed to redirect the user back after authentication and after signing out
      // See here more information about default values including scopes - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.OAuthSettings.html
      oAuth: {
        callbackUrls: ['https://dtax9bz89ohex.cloudfront.net', 'http://localhost:3000/'],
        logoutUrls: ['https://dtax9bz89ohex.cloudfront.net', 'http://localhost:3000/']
      }
      // All identity providers created before in the user pool are automatically allowed in this app
    })

    // Create SSM Parameters
    new ssm.StringParameter(this, 'UserPoolId', {
      description: `${props.appName} Cognito User Pool ID`,
      parameterName: `/${props.appName}/cognito/userPoolId`,
      stringValue: userPool.userPoolId
    })
    new ssm.StringParameter(this, 'UserPoolWebClientId', {
      description: `${props.appName} Cognito User Pool Web Client ID`,
      parameterName: `/${props.appName}/cognito/webClientId`,
      stringValue: userPoolClient.userPoolClientId
    })

    /**
     * Cognito Identity Pool + Authenticated Role
     */
    const identityPool = new IdentityPool(this, 'myIdentityPool', {
      identityPoolName: `${props.appName}-identityPool`,
      authenticationProviders: {
        userPools: [new UserPoolAuthenticationProvider({
          userPool,
          userPoolClient
        })]
      },
      roleMappings: [{
        mappingKey: 'cognito', // this value can be anything, it's only for the CF mapping
        providerUrl: IdentityPoolProviderUrl.userPool(
          `cognito-idp.${Stack.of(this).region}.amazonaws.com/${userPool.userPoolId}:${userPoolClient.userPoolClientId}`
        ),
        useToken: true, // use role from token
        resolveAmbiguousRoles: true
      }]
    })
    identityPool.authenticatedRole.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [...perms.S3_READ_ACCESS, ...perms.S3_WRITE_ACCESS],
      resources: [`arn:aws:s3:::${props.bucketName}`, `arn:aws:s3:::${props.bucketName}/*`]
    }))

    new ssm.StringParameter(this, 'IdentityPoolId', {
      description: `${props.appName} Identity Pool ID`,
      parameterName: `/${props.appName}/cognito/identityPoolId`,
      stringValue: identityPool.identityPoolId
    })

    /**
     * User Pool Admin group and Role
     */
    const adminRole = new iam.Role(this, 'authRole', {
      roleName: `${props.appName}-IdentityPool-Default-Auth-Role`,
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com', {
          'StringEquals': {
            'cognito-identity.amazonaws.com:aud': identityPool.identityPoolId
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated'
          }
        }, 'sts:AssumeRoleWithWebIdentity'
      )
    })
    adminRole.addToPolicy(new iam.PolicyStatement({
      actions: [...perms.S3_READ_ACCESS, ...perms.S3_WRITE_ACCESS, ...perms.S3_DELETE_ACCESS],
      resources: [`arn:aws:s3:::${props.bucketName}`, `arn:aws:s3:::${props.bucketName}/*`]
    }))

    new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: userPool.userPoolId,
      description: 'Application admin',
      groupName: 'Admin',
      roleArn: adminRole.roleArn,
      precedence: 0
    })

  }
}
