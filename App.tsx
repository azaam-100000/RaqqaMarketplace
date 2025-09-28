

import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Spinner from './components/ui/Spinner';
import AppLayout from './components/AppLayout';

const LoginScreen = lazy(() => import('./screens/LoginScreen'));
const SignUpScreen = lazy(() => import('./screens/SignUpScreen'));
const VerificationScreen = lazy(() => import('./screens/VerificationScreen'));
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const LiveConversationScreen = lazy(() => import('./screens/LiveConversationScreen'));
const PostDetailScreen = lazy(() => import('./screens/PostDetailScreen'));
const StoresScreen = lazy(() => import('./screens/StoresScreen'));
const CreateStoreScreen = lazy(() => import('./screens/CreateStoreScreen'));
const StoreDetailScreen = lazy(() => import('./screens/StoreDetailScreen'));
const CreateProductScreen = lazy(() => import('./screens/CreateProductScreen'));
const ProductDetailScreen = lazy(() => import('./screens/ProductDetailScreen'));
const MessagesScreen = lazy(() => import('./screens/MessagesScreen'));
const ChatScreen = lazy(() => import('./screens/ChatScreen'));
const GroupsScreen = lazy(() => import('./screens/GroupsScreen'));
const CreateGroupScreen = lazy(() => import('./screens/CreateGroupScreen'));
const GroupDetailScreen = lazy(() => import('./screens/GroupDetailScreen'));
const GroupMembersScreen = lazy(() => import('./screens/GroupMembersScreen'));
const NotificationsScreen = lazy(() => import('./screens/NotificationsScreen'));
const UserScreen = lazy(() => import('./screens/UserScreen'));
const CurrencyScreen = lazy(() => import('./screens/CurrencyScreen'));
const CallScreen = lazy(() => import('./screens/CallScreen'));
const FollowersScreen = lazy(() => import('./screens/FollowersScreen'));
const SearchScreen = lazy(() => import('./screens/SearchScreen'));
const HouseRentalsScreen = lazy(() => import('./screens/HouseRentalsScreen'));
const CreateRentalScreen = lazy(() => import('./screens/CreateRentalScreen'));
const RentalDetailScreen = lazy(() => import('./screens/RentalDetailScreen'));
const EditRentalScreen = lazy(() => import('./screens/EditRentalScreen'));


const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Spinner /></div>}>
          <Routes>
            {/* Auth routes without the main layout */}
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/signup" element={<SignUpScreen />} />
            <Route path="/verify" element={<VerificationScreen />} />
            
            {/* Routes with the main AppLayout (includes bottom nav) */}
            <Route 
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/home" element={<HomeScreen />} />
                      <Route path="/profile" element={<ProfileScreen />} />
                      <Route path="/user/:userId" element={<UserScreen />} />
                      <Route path="/user/:userId/:followType" element={<FollowersScreen />} />
                      <Route path="/live-conversation" element={<LiveConversationScreen />} />
                      <Route path="/post/:postId" element={<PostDetailScreen />} />
                      
                      {/* Search */}
                      <Route path="/search" element={<SearchScreen />} />

                      {/* Stores & Products */}
                      <Route path="/stores" element={<StoresScreen />} />
                      <Route path="/stores/new" element={<CreateStoreScreen />} />
                      <Route path="/store/:storeId" element={<StoreDetailScreen />} />
                      <Route path="/store/:storeId/products/new" element={<CreateProductScreen />} />
                      <Route path="/product/:productId" element={<ProductDetailScreen />} />

                      {/* Messaging */}
                      <Route path="/messages" element={<MessagesScreen />} />
                      <Route path="/chat/:userId" element={<ChatScreen />} />
                      <Route path="/call/:userId/:callType" element={<CallScreen />} />


                      {/* Groups */}
                      <Route path="/groups" element={<GroupsScreen />} />
                      <Route path="/groups/new" element={<CreateGroupScreen />} />
                      <Route path="/group/:groupId" element={<GroupDetailScreen />} />
                      <Route path="/group/:groupId/members" element={<GroupMembersScreen />} />

                      {/* Notifications */}
                      <Route path="/notifications" element={<NotificationsScreen />} />
                      
                      {/* Currency Rates */}
                      <Route path="/rates" element={<CurrencyScreen />} />
                      
                      {/* House Rentals */}
                      <Route path="/rentals" element={<HouseRentalsScreen />} />
                      <Route path="/rentals/new" element={<CreateRentalScreen />} />
                      <Route path="/rental/:rentalId" element={<RentalDetailScreen />} />
                      <Route path="/rental/:rentalId/edit" element={<EditRentalScreen />} />

                       {/* Default route for logged-in users */}
                      <Route path="*" element={<Navigate to="/home" />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;