# React Cognito App with Social Sign-in

This is a React application defined on the [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/home.html) that implements federated social sign-in using [AWS Cognito user pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html). 

Your app users can sign in either directly through a user pool, or federate through a third-party identity provider (IdP). The user pool manages the overhead of handling the tokens that are returned from social sign-in through Facebook and Google. With the built-in hosted web UI, Amazon Cognito provides token handling and management for authenticated users from all IdPs. This way, your backend systems can standardize on one set of user pool tokens.


## Cognito with Social

 Sign-in through a third party (federation) is available in Amazon Cognito user pools. **This feature is independent of federation through Amazon Cognito identity pools (federated identities)**.

 When you connect Amazon Cognito to social, SAML, or OpenID Connect (OIDC) IdPs, your IdPs pass an OIDC ID token or a SAML assertion to Amazon Cognito. Amazon Cognito reads the claims about your user in the token or assertion and maps those claims to a new user profile in your user pool directory.

 Amazon Cognito then creates a user profile for your federated user in its own directory. Amazon Cognito adds attributes to your user based on the claims from your IdP and, in the case of OIDC and social identity providers, an IdP-operated public userinfo endpoint.


### Cognito Requirements

If you want your users to sign in with federated providers, you must create a [domain](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-assign-domain-prefix.html). This sets up the Amazon Cognito hosted UI and OAuth 2.0 endpoints. Please notice that the hosted UI is required to integrate with supported social identity providers. When Amazon Cognito builds your hosted UI, it creates OAuth 2.0 endpoints that Amazon Cognito and your social IdPs use to exchange information. 

After adding a domain you also need to configure the allowed callback and sign-outs URLs on the Cognito app client. The social Identity Providers that will be configured later, will also need to be allowed on this app. See [here](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-app-idp-settings.html) for more information related to app configuration. 


### Authentication flow with external identity providers

The [/oauth2/authorize endpoint](https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html) is a redirection endpoint that supports two redirect destinations. If you include an identity_provider or idp_identifier parameter in the URL, it silently redirects your user to the sign-in page for that identity provider (IdP). Otherwise, it redirects to the Login endpoint with the same URL parameters that you included in your request.

<img src="images/flow.png" width="80%">

To use the authorize endpoint, invoke your user's browser at /oauth2/authorize with parameters that provide your user pool with information about the following user pool details.
* The app client that you want to sign in to.
* The callback URL that you want to end up at.
* The OAuth 2.0 scopes that you want to request in your user's access token.
* Optionally, the third-party IdP that you want to use to sign in.

The Authorize endpoint is a redirection endpoint. If you provide an idp_identifier or identity_provider parameter in your request, it redirects silently to your IdP, bypassing the hosted UI. 

If we open the hosted UI we can understand this process better.

Please notice you can only check the steps described below after you have finished the configuration of the user pool with the Facebook and Google identity provider. 

<img src="images/hosted_ui.png" width="80%">

Facebook login button points to the oauth2 endpoint and the `redirect_url` points to the application url. The Cognito app_id and scopes are also specified. 

```
window.location.href='/oauth2/authorize?identity_provider=Facebook&redirect_uri=https://<website_domain>&response_type=CODE&client_id=<cognito_app_client_id>&scope=aws.cognito.signin.user.admin email openid phone profile
```

When you click on facebook sign-in button, it redirects to the Facebook login page. 
You can see how the redirect url is pointing to `user_pool_domain/outh2/idpresponse` endpoint.

```
https://www.facebook.com/login.php?skip_api_login=1&api_key=<facebook_app_id>&kid_directed_site=0&app_id=<facebook_app_id>&signed_next=1&next=https%3A%2F%2Fwww.facebook.com%2Fv15.0%2Fdialog%2Foauth%3Fclient_id%3D97%26redirect_uri=<user_pool_domain>/oauth2/idpresponse%26scope%3Dpublic_profile%252Cemail%26response_type%3Dcode%26state%3DH4sIAAAAAAAAAFWR23KbMBCG30XXhnCyDNzlgOOxaye1ndSh0-……………
```

After logging for identity provider (Facebook in this case)
Your IdPs pass an [OIDC](https://auth0.com/docs/authenticate/protocols/openid-connect-protocol) token to Amazon Cognito. Amazon Cognito reads the claims about your user in the token and maps those claims to a new user profile in your user pool directory. Amazon Cognito then creates a user profile for your federated user in its own directory. Amazon Cognito adds attributes to your user based on the claims from your IdP and, in the case of OIDC and social identity providers, an IdP-operated public userinfo endpoint.

After Amazon Cognito creates a profile for your federated user, it changes its function and presents itself as the IdP to your app, which is now the SP. Amazon Cognito is a combination OIDC and OAuth 2.0 IdP. It generates access tokens, ID tokens, and refresh tokens.


### Add Facebook social identity provider to user pool

You need to register a new application on the Facebook development portal.

Follow the steps described on the AWS documentation.
https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html#cognito-user-pools-social-idp-step-1

On step 9, this is the same hosted UI URL. You can go to the Cognito app client and then click on hosted ui. 

You also need to create a privacy and data deletion policy. You also need to publish these policies and reference the URL on the app. 

<img src="images/facebook_app_1.png" width="80%">

In development mode, your app can only request data from users with an app role (App Role -> Roles). To request end user data, your app must have advanced access permission and be set to live mode.

Notice that all applications must be set to live mode for production access. 

When an app is in development mode, it will have access to all permissions and features, but can only access data for the following roles on the app: Administrator, Developer, Tester and Analytics User.

https://developers.facebook.com/docs/graph-api/overview/access-levels/
If your app will only be used by people who have a role on it, the permissions and features your app requires will only need Standard Access. If your app will be used by people who do not have a role on it, the permissions and features that your app requires will need Advanced Access.


### Add Google social identity provider to a user pool

Follow the steps described on the AWS documentation.
https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html#cognito-user-pools-social-idp-step-1

Sign in to the cloud platform console - https://console.cloud.google.com/home/dashboard
New project 

### Add social IdPs to user pool 

You can take a look at the steps on the AWS documentation https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html#cognito-user-pools-social-idp-step-2

See the CDK 

### Configure Authentication on React app

https://docs.amplify.aws/lib/auth/social/q/platform/js/#setup-frontend

After configuring the OAuth endpoints (Cognito Hosted UI), you can integrate your App by invoking Auth.federatedSignIn() function.




