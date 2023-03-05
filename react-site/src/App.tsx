import React, { useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Auth } from 'aws-amplify'
import {
  ChakraProvider,
  Box,
  Drawer,
  DrawerContent,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react'

import Sidebar from 'components/Sidebar/Sidebar'
import TopNav from 'components/TopNav/TopNav'
import HomePage from 'views/HomePage'
import LoginForm from 'components/Auth/Login'
import ChangePassword from 'components/Auth/ChangePassword'
import ResetPassword from 'components/Auth/ResetPassword'
import AuthContext from 'store/auth-context'
import NewUser from 'components/NewUser/NewUser'

const App = () => {
  const authCtx = useContext(AuthContext)

  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <ChakraProvider>
      <Box minH="100vh" bg={useColorModeValue('gray.100', 'gray.900')}>
        {authCtx?.isLoggedIn && (
          <>
            <Sidebar onClose={() => onClose} display={{ base: 'none', md: 'block' }} />
            <Drawer
              autoFocus={false}
              isOpen={isOpen}
              placement="left"
              onClose={onClose}
              returnFocusOnClose={false}
              onOverlayClick={onClose}
              size="full"
            >
              <DrawerContent>
                <Sidebar onClose={onClose} />
              </DrawerContent>
            </Drawer>
            <TopNav onOpen={onOpen} />
          </>
        )}

        <Box ml={{ base: 0, md: authCtx?.isLoggedIn ? 60 : 0 }} p={authCtx?.isLoggedIn ? 4 : 0}>
          <Routes>
            {!authCtx?.isLoggedIn && <Route path="/login" element={<LoginForm />} />}
            <Route path="/password-reset" element={<ResetPassword />} />
            <Route path="/new-user" element={<NewUser />} />
            {authCtx?.isLoggedIn && <Route path="/password-change" element={<ChangePassword />} />}
            <Route
              path="/"
              element={authCtx?.isLoggedIn ? <HomePage /> : <Navigate to="/login" />}
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Box>
      </Box>
    </ChakraProvider>
  )
}

export default App
