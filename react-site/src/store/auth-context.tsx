import React, { useEffect, useState } from 'react'
import { Auth } from 'aws-amplify'
import { CognitoUser } from '@aws-amplify/auth'

export interface AuthContextInterface {
  user: CognitoUser | null
  isLoggedIn: boolean
  isAdmin: boolean
  login: (user: CognitoUser) => void
  logout: () => void
}

const AuthContext = React.createContext<AuthContextInterface | null>(null)

// Check if running localhost
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // 127.0.0.1/8 is considered localhost for IPv4.
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
)

// Amplify configuration for Cognito User Pool
Auth.configure({
  region: 'us-east-1',
  userPoolId: process.env.REACT_APP_USER_POOL_ID, // Cognito User Pool ID
  userPoolWebClientId: process.env.REACT_APP_WEBCLIENT_ID, // Cognito Web Client ID
  identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID, // Only if using Cognito Identity Pool
  mandatorySignIn: true,
  authenticationFlowType: 'USER_SRP_AUTH',
  // Configuration to sign-in through external social identity providers
  oauth: {
    domain: process.env.REACT_APP_USER_POOL_DOMAIN,
    scope: ['email', 'profile', 'openid', 'aws.cognito.signin.user.admin'],
    redirectSignIn: isLocalhost ? 'http://localhost:3000/' : process.env.REACT_APP_URL,
    redirectSignOut: isLocalhost ? 'http://localhost:3000/' : process.env.REACT_APP_URL,
    responseType: 'code' // or 'token', note that REFRESH token will only be generated when the responseType is code
  }
})

// const getSession = (): Promise<CognitoUserSession | null> => Auth.currentSession()

const getCognitoUserGroups = (user: CognitoUser): string[] => {
  const groups = user.getSignInUserSession()?.getAccessToken().payload['cognito:groups'] as string[]
  return groups === undefined ? [] : groups
}
interface Props {
  children: React.ReactNode
}

export const AuthContextProvider: React.FC<Props> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CognitoUser | null>(null)
  const [userGroups, setUserGroups] = useState<string[]>([])

  const userIsLoggedIn = !!currentUser
  const isAdmin = userGroups.indexOf('Admin') >= 0

  const checkLogin = () => {
    Auth.currentAuthenticatedUser()
      .then((user: CognitoUser) => {
        setCurrentUser(user)
        setUserGroups(getCognitoUserGroups(user))
      })
      .catch(() => setCurrentUser(null))
  }

  useEffect(() => {
    checkLogin()
  }, [])

  const loginHandler = (user: CognitoUser) => {
    console.log(user)
    setCurrentUser(user)
    setUserGroups(getCognitoUserGroups(user))
  }

  const logoutHandler = () => {
    setCurrentUser(null)
    Auth.signOut().catch((err) => console.log(err))
  }

  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const contextValue: AuthContextInterface = {
    user: currentUser,
    isLoggedIn: userIsLoggedIn,
    isAdmin,
    login: loginHandler,
    logout: logoutHandler
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export default AuthContext
