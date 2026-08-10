/* eslint-disable */
import { supabase, supabaseAdmin } from '../supabase/supabaseClient';

const setToken = (token) => {
    localStorage.setItem('token', token);
};

const getToken = () => {
    return localStorage.getItem('token');
};

const getUserEmail = () => {
    return localStorage.getItem('user_email');
};

const getUserRole = () => {
    return localStorage.getItem('user_role');
};

// Get Super Admin status
const getIsSuperAdmin = () => {
    return localStorage.getItem('is_super_admin') === 'true';
};

const getUserId = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id || localStorage.getItem('user_id');
    } catch (error) {
        console.error('Error getting user ID:', error);
        return localStorage.getItem('user_id');
    }
};

const login = async (userData) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: userData.email,
            password: userData.password,
        });

        if (error) {
            throw error;
        }

        // Clear any existing localStorage first
        localStorage.clear();

        // Get user profile with role - Use admin client to bypass RLS during login
        let profile = null;
        
    // (debug removed) Looking for profile for user
        
        // FIRST try to get by email using admin client (bypasses RLS)
        const { data: profileByEmail, error: profileError1 } = await supabaseAdmin
            .from('user_profiles')
            .select('role, user_id, is_super_admin')
            .eq('email', data.user.email)
            .single();

    // (debug removed) profile by email check

        if (profileByEmail) {
            profile = profileByEmail;
            // Update the user_id in the profile if it's different
            if (profileByEmail.user_id !== data.user.id) {
                // (debug removed) updating user_id in profile
                await supabaseAdmin
                    .from('user_profiles')
                    .update({ user_id: data.user.id })
                    .eq('email', data.user.email);
            }
        } else {
            // Only try by user_id if email lookup failed
            const { data: profileByUserId, error: profileError2 } = await supabaseAdmin
                .from('user_profiles')
                .select('role, is_super_admin')
                .eq('user_id', data.user.id)
                .single();

            // (debug removed) profile by user_id fallback

            if (profileByUserId) {
                profile = profileByUserId;
            } else {
                console.error('No profile found for user:', data.user.email);
                // (debug removed) warn about missing profile
                // DO NOT create new profiles automatically - admin should be set up manually
                throw new Error('User profile not found. Please contact administrator to set up your account.');
            }
        }

    // (debug removed) profile details

        // Store the access token and user info
        if (data.session) {
            setToken(data.session.access_token);
            localStorage.setItem('user_email', data.user.email);
            
            // Determine the actual role including Super Admin
            let userRole = profile?.role || 'USER';
            if (profile?.is_super_admin === true) {
                userRole = 'SUPER_ADMIN';
            }
            
            localStorage.setItem('user_role', userRole);
            localStorage.setItem('user_id', data.user.id);
            localStorage.setItem('is_super_admin', profile?.is_super_admin === true ? 'true' : 'false');
            
            // (debug removed) stored role and super admin status
        }

        return {
            data: {
                accessToken: data.session?.access_token,
                user: data.user,
                role: profile?.role || 'USER'
            }
        };
    } catch (error) {
        console.error('Login error:', error);
        return { error };
    }
};

const signUp = async (userData) => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
        });

        if (error) {
            throw error;
        }

        return { data };
    } catch (error) {
        console.error('Signup error:', error);
        return { error };
    }
};

const createUser = async (userData) => {
    try {
        // Create user in Supabase Auth using admin client
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true
        });

        if (authError) {
            throw authError;
        }

        // Get the current user ID for created_by field
        const currentUserId = await getUserId();

        // Create user profile using admin client to bypass RLS
        const { data: profileData, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .insert([
                {
                    user_id: authData.user.id,
                    email: userData.email,
                    role: userData.role || 'USER',
                    created_by: currentUserId
                }
            ])
            .select();

        if (profileError) {
            throw profileError;
        }

        return { data: { user: authData.user, profile: profileData[0] } };
    } catch (error) {
        console.error('Create user error:', error);
        return { error };
    }
};

const getAllUsers = async () => {
    try {
        // Use admin client to bypass RLS policies for user management
        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .select(`
                id,
                user_id,
                email,
                role,
                is_super_admin,
                created_at,
                created_by
            `)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return { data };
    } catch (error) {
        console.error('Get all users error:', error);
        return { error };
    }
};

const deleteUser = async (userId) => {
    try {
        // Get current user ID to prevent self-deletion
        const currentUserId = await getUserId();
        const currentAdminLevel = await getAdminLevel();
        
        // Prevent self-deletion
        if (userId === currentUserId) {
            throw new Error('You cannot delete your own account');
        }

        // Check if current user has admin privileges
        if (currentAdminLevel === 'USER') {
            throw new Error('Access denied. Only administrators can delete users.');
        }

        // Get target user profile using admin client to bypass RLS
        const { data: userProfile, error: profileCheckError } = await supabaseAdmin
            .from('user_profiles')
            .select('role, is_super_admin, email')
            .eq('user_id', userId)
            .single();

        if (profileCheckError) {
            throw new Error('User not found');
        }

        // Super Admin protection
        const targetIsSuper = userProfile.is_super_admin === true || userProfile.role === 'SUPER_ADMIN';
        if (targetIsSuper) {
            throw new Error('Super Admin accounts cannot be deleted for security reasons.');
        }

        // Regular admin deletion protection - only Super Admin can delete admins
        if (userProfile.role === 'ADMIN' && currentAdminLevel !== 'SUPER_ADMIN') {
            throw new Error('Only Super Admin can delete other admin accounts.');
        }

        // Additional check: ensure we're not deleting the last admin (excluding super admin)
        if (userProfile.role === 'ADMIN') {
            const { data: adminUsers } = await supabaseAdmin
                .from('user_profiles')
                .select('id')
                .eq('role', 'ADMIN');
            
            if (adminUsers && adminUsers.length <= 1) {
                throw new Error('Cannot delete the last admin user in the system');
            }
        }

        // First delete from auth.users using admin client
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
            throw authError;
        }

        // Then delete from user_profiles using admin client
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .delete()
            .eq('user_id', userId);

        if (profileError) {
            console.warn('Profile deletion failed, but auth user was deleted:', profileError);
        }

    // (info removed) user deletion logged
        return { success: true };
    } catch (error) {
        console.error('Delete user error:', error);
        return { error };
    }
};

const isLoggedIn = async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    } catch (error) {
        console.error('Error checking session:', error);
        return false;
    }
};

const refreshUserRole = async () => {
    try {
        const userEmail = getUserEmail();
        const userId = await getUserId();
        
        if (!userEmail || !userId) {
            console.warn('No user email or ID found for role refresh');
            return getUserRole(); // Return cached role instead of null
        }

        // Get fresh role from database using admin client to bypass RLS
        const { data: profile, error } = await supabaseAdmin
            .from('user_profiles')
            .select('role, is_super_admin')
            .eq('email', userEmail)
            .single();

        if (error) {
            console.warn('Error refreshing user role, using cached role:', error);
            return getUserRole(); // Return cached role on error
        }

        // Update localStorage with fresh role and super admin status
        if (profile) {
            let userRole = profile.role || 'USER';
            if (profile.is_super_admin === true) {
                userRole = 'SUPER_ADMIN';
            }
            
            localStorage.setItem('user_role', userRole);
            localStorage.setItem('is_super_admin', profile.is_super_admin === true ? 'true' : 'false');
            
            console.log('User role refreshed successfully:', userRole);
            return userRole;
        }

        // If no profile found, return cached role
        return getUserRole();
    } catch (error) {
        console.warn('Error refreshing user role, using cached role:', error);
        return getUserRole(); // Return cached role instead of null on any error
    }
};

const logOut = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout error:', error);
        }
        localStorage.clear();
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.clear();
    }
};

// Debug function to check user profile
const debugUserProfile = async (email) => {
    try {
    // (debug removed) start debugUserProfile
        
        // Check auth session first
        const { data: { session } } = await supabase.auth.getSession();
    // (debug removed) current session
        
        if (!session) {
            console.error('No active session found');
            return null;
        }
        
        // Check user_profiles table with authenticated user
        const { data: profiles, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('email', email);
            
    // (debug removed) user profiles for email
        if (error) console.error('Profile query error:', error);
        
        // Check all profiles
        const { data: allProfiles } = await supabase
            .from('user_profiles')
            .select('*');
    // (debug removed) all profiles listing
        
        // Also try by user_id
        const { data: profileById } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', session.user.id);
    // (debug removed) profile by current user id
        
        return profiles;
    } catch (error) {
        console.error('Debug error:', error);
        return null;
    }
};

const fixUserSession = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
            // Update localStorage with correct UUID
            localStorage.setItem('user_id', user.id);
            localStorage.setItem('user_email', user.email);
            console.log('Fixed user session with proper UUID:', user.id);
            return user.id;
        }
        return null;
    } catch (error) {
        console.error('Error fixing user session:', error);
        return null;
    }
};

const restoreAdminRole = async (email) => {
    try {
        console.log('Attempting to restore admin role for:', email);
        
        // Update the user's role back to ADMIN using admin client
        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .update({ role: 'ADMIN' })
            .eq('email', email)
            .select();

        if (error) {
            throw error;
        }

        console.log('Admin role restored for:', email, data);
        return { success: true, data };
    } catch (error) {
        console.error('Error restoring admin role:', error);
        return { error };
    }
};

const ensureAdminProtection = async () => {
    try {
        // Check if there are any admin users in the system using admin client
        const { data: adminUsers, error } = await supabaseAdmin
            .from('user_profiles')
            .select('email, role')
            .eq('role', 'ADMIN');

        if (error) {
            console.error('Error checking admin users:', error);
            return { error };
        }

        const adminCount = adminUsers?.length || 0;
        console.log(`Found ${adminCount} admin users in the system`);

        if (adminCount === 0) {
            console.warn('⚠️  WARNING: No admin users found in the system!');
            return { warning: 'No admin users found in system' };
        }

        return { success: true, adminCount, adminUsers };
    } catch (error) {
        console.error('Error ensuring admin protection:', error);
        return { error };
    }
};

// Check if user is Super Admin
const isSuperAdmin = async (userId = null) => {
    try {
        // First check localStorage for immediate response
        const localStorageCheck = getIsSuperAdmin();
        if (localStorageCheck) {
            return true;
        }

        // Fallback to database check using admin client to bypass RLS
        const checkUserId = userId || await getUserId();
        if (!checkUserId) return false;

        const { data: profile, error } = await supabaseAdmin
            .from('user_profiles')
            .select('role, is_super_admin')
            .eq('user_id', checkUserId)
            .single();

        if (error) return false;
        return profile?.is_super_admin === true || profile?.role === 'SUPER_ADMIN';
    } catch (error) {
        console.error('Error checking super admin status:', error);
        return false;
    }
};

// Get user's admin level
const getAdminLevel = async (userId = null) => {
    try {
        // First check localStorage for immediate response
        const localRole = getUserRole();
        if (localRole === 'SUPER_ADMIN') return 'SUPER_ADMIN';
        if (localRole === 'ADMIN') return 'ADMIN';
        if (localRole === 'USER') return 'USER';

        // Fallback to database check using admin client to bypass RLS
        const checkUserId = userId || await getUserId();
        if (!checkUserId) return 'USER';

        const { data: profile, error } = await supabaseAdmin
            .from('user_profiles')
            .select('role, is_super_admin')
            .eq('user_id', checkUserId)
            .single();

        if (error) return 'USER';
        
        if (profile?.is_super_admin === true || profile?.role === 'SUPER_ADMIN') {
            return 'SUPER_ADMIN';
        } else if (profile?.role === 'ADMIN') {
            return 'ADMIN';
        } else {
            return 'USER';
        }
    } catch (error) {
        console.error('Error getting admin level:', error);
        return 'USER';
    }
};

// Change user password - admin only function with Super Admin protection
const changeUserPassword = async (userId, newPassword, isOwnPassword = false) => {
    try {
        // Get current user info
        const currentUserId = await getUserId();
        const currentUserRole = getUserRole();
        const currentAdminLevel = await getAdminLevel();
        
        if (!currentUserId) {
            throw new Error('User not authenticated');
        }

        // Check if user has admin privileges
        if (currentAdminLevel === 'USER') {
            throw new Error('Access denied. Only administrators can change passwords.');
        }

        // Get target user info using admin client to bypass RLS
        const { data: targetProfile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('email, role, is_super_admin')
            .eq('user_id', userId)
            .single();

        if (profileError) {
            throw new Error('User not found');
        }

        // Super Admin protection - only Super Admin can change Super Admin passwords (self or otherwise)
        const targetIsSuper = targetProfile.is_super_admin === true || targetProfile.role === 'SUPER_ADMIN';
        if (targetIsSuper && currentAdminLevel !== 'SUPER_ADMIN') {
            throw new Error('Access denied. Only Super Admin can change a Super Admin password.');
        }

        // Validate password
        if (!newPassword || newPassword.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        // Additional security check for changing own password
        if (isOwnPassword && userId !== currentUserId) {
            throw new Error('Security violation: User ID mismatch');
        }

        if (profileError) {
            throw new Error('User not found');
        }

        // Use admin client to update password
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword
        });

        if (error) {
            throw error;
        }

        console.log('Password changed successfully for user:', targetProfile.email);
        return { 
            success: true, 
            message: `Password changed successfully for ${targetProfile.email}`,
            userEmail: targetProfile.email
        };
    } catch (error) {
        console.error('Change password error:', error);
        return { error: error.message || 'Failed to change password' };
    }
};

// Change own password with additional security and Super Admin protection
const changeOwnPassword = async (currentPassword, newPassword) => {
    try {
        const currentUserId = await getUserId();
        const currentUserEmail = getUserEmail();
        const adminLevel = await getAdminLevel();
        
        if (!currentUserId || !currentUserEmail) {
            throw new Error('User not authenticated');
        }

    // Allow Super Admin to change own password now (previously restricted). Extra verification already occurs via re-auth.

        // Validate new password
        if (!newPassword || newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters long');
        }

        // Verify current password by attempting to sign in
        const { error: verifyError } = await supabase.auth.signInWithPassword({
            email: currentUserEmail,
            password: currentPassword,
        });

        if (verifyError) {
            throw new Error('Current password is incorrect');
        }

        // Update password using admin client
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(currentUserId, {
            password: newPassword
        });

        if (error) {
            throw error;
        }

        console.log('Own password changed successfully');
        return { 
            success: true, 
            message: 'Your password has been changed successfully'
        };
    } catch (error) {
        console.error('Change own password error:', error);
        return { error: error.message || 'Failed to change password' };
    }
};

// Promote user to admin - Super Admin only
const promoteToAdmin = async (userId) => {
    try {
        const currentAdminLevel = await getAdminLevel();
        
        if (currentAdminLevel !== 'SUPER_ADMIN') {
            throw new Error('Access denied. Only Super Admin can promote users to admin.');
        }

        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('email, role')
            .eq('user_id', userId)
            .single();

        if (profileError) {
            throw new Error('User not found');
        }

        if (userProfile.role === 'ADMIN') {
            throw new Error('User is already an admin');
        }

        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .update({ role: 'ADMIN' })
            .eq('user_id', userId)
            .select();

        if (error) {
            throw error;
        }

        console.log(`User ${userProfile.email} promoted to admin`);
        return { 
            success: true, 
            message: `${userProfile.email} has been promoted to admin`,
            userEmail: userProfile.email
        };
    } catch (error) {
        console.error('Promote to admin error:', error);
        return { error: error.message || 'Failed to promote user' };
    }
};

// Demote admin to user - Super Admin only
const demoteFromAdmin = async (userId) => {
    try {
        const currentUserId = await getUserId();
        const currentAdminLevel = await getAdminLevel();
        
        if (currentAdminLevel !== 'SUPER_ADMIN') {
            throw new Error('Access denied. Only Super Admin can demote admin users.');
        }

        if (userId === currentUserId) {
            throw new Error('Super Admin cannot demote themselves');
        }

        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('email, role, is_super_admin')
            .eq('user_id', userId)
            .single();

        if (profileError) {
            throw new Error('User not found');
        }

        // Cannot demote Super Admin
        if (userProfile.is_super_admin === true || userProfile.role === 'SUPER_ADMIN') {
            throw new Error('Cannot demote Super Admin');
        }

        if (userProfile.role !== 'ADMIN') {
            throw new Error('User is not an admin');
        }

        // Check if this is the last admin using admin client
        const { data: adminUsers } = await supabaseAdmin
            .from('user_profiles')
            .select('id')
            .eq('role', 'ADMIN');
        
        if (adminUsers && adminUsers.length <= 1) {
            throw new Error('Cannot demote the last admin user in the system');
        }

        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .update({ role: 'USER' })
            .eq('user_id', userId)
            .select();

        if (error) {
            throw error;
        }

        console.log(`Admin ${userProfile.email} demoted to user`);
        return { 
            success: true, 
            message: `${userProfile.email} has been demoted from admin to user`,
            userEmail: userProfile.email
        };
    } catch (error) {
        console.error('Demote from admin error:', error);
        return { error: error.message || 'Failed to demote user' };
    }
};

export const authService = {
    logOut,
    getToken,
    setToken,
    login,
    signUp,
    getUserEmail,
    getUserRole,
    getIsSuperAdmin,
    getUserId,
    fixUserSession,
    isLoggedIn,
    createUser,
    getAllUsers,
    deleteUser,
    refreshUserRole,
    debugUserProfile,
    restoreAdminRole,
    ensureAdminProtection,
    changeUserPassword,
    changeOwnPassword,
    isSuperAdmin,
    getAdminLevel,
    promoteToAdmin,
    demoteFromAdmin,
    // Helper: treat SUPER_ADMIN as having admin capabilities
    isAdminOrSuperAdmin: () => {
        const role = getUserRole();
        return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'admin';
    }
};
