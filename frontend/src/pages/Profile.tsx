import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LogOut, User, Edit, Mail, Save, X, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Profile = () => {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: user?.user_metadata?.full_name || 'Student',
    email: user?.email || '',
    bio: 'STEM enthusiast looking to explore new opportunities.',
    interests: ['Computer Science', 'Mathematics', 'Robotics']
  });
  const [editableProfile, setEditableProfile] = useState({ ...userProfile });
  const [newInterest, setNewInterest] = useState('');

  // Fetch user profile data from Supabase on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      console.log('Fetching profile for user:', user.id);
      
      try {
        // Try to get the profile using the id (primary key)
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.log('Profile fetch error:', error);
          
          if (error.code === 'PGRST116') { // No rows returned
            console.log('No profile found, creating a new one...');
            
            // Create a new profile
            const newProfile = {
              id: user.id,
              user_id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || 'Student',
              bio: 'STEM enthusiast looking to explore new opportunities.',
              interests: ['Computer Science', 'Mathematics', 'Robotics'],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            console.log('Creating new profile:', newProfile);
            
            const { data: insertData, error: insertError } = await supabase
              .from('profiles')
              .insert(newProfile)
              .select();
              
            if (insertError) {
              console.error('Error creating profile:', insertError);
              console.log('Insert error details:', insertError.details, insertError.hint, insertError.message);
              
              // If there's an error with insert, try upsert instead
              console.log('Trying upsert instead...');
              const { error: upsertError } = await supabase
                .from('profiles')
                .upsert(newProfile);
                
              if (upsertError) {
                console.error('Upsert also failed:', upsertError);
                console.log('Upsert error details:', upsertError.details, upsertError.hint, upsertError.message);
                return;
              }
            }
            
            console.log('Profile created successfully:', insertData);
            
            // Use default profile data
            setUserProfile({
              name: user.user_metadata?.full_name || 'Student',
              email: user.email || '',
              bio: 'STEM enthusiast looking to explore new opportunities.',
              interests: ['Computer Science', 'Mathematics', 'Robotics']
            });
            
            setEditableProfile({
              name: user.user_metadata?.full_name || 'Student',
              email: user.email || '',
              bio: 'STEM enthusiast looking to explore new opportunities.',
              interests: ['Computer Science', 'Mathematics', 'Robotics']
            });
            
            return;
          } else {
            console.error('Error fetching user profile:', error);
            return;
          }
        }
        
        console.log('Profile data retrieved:', data);
        
        if (data) {
          // Update the profile with data from the database
          setUserProfile({
            name: user.user_metadata?.full_name || data.full_name || 'Student',
            email: user.email || data.email || '',
            bio: data.bio || 'STEM enthusiast looking to explore new opportunities.',
            interests: data.interests || ['Computer Science', 'Mathematics', 'Robotics']
          });
          
          setEditableProfile({
            name: user.user_metadata?.full_name || data.full_name || 'Student',
            email: user.email || data.email || '',
            bio: data.bio || 'STEM enthusiast looking to explore new opportunities.',
            interests: data.interests || ['Computer Science', 'Mathematics', 'Robotics']
          });
        }
      } catch (err) {
        console.error('Unexpected error fetching profile:', err);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const startEditing = () => {
    setEditableProfile({ ...userProfile });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setNewInterest('');
  };

  const saveChanges = async () => {
    if (!user) return;
    
    setIsLoading(true);
    console.log('Saving profile for user:', user.id);
    
    try {
      // First, check if a profile exists for this user
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (fetchError) {
        console.log('Fetch error code:', fetchError.code);
        console.log('Fetch error details:', fetchError);
        
        if (fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
          console.error('Error fetching profile:', fetchError);
          setIsLoading(false);
          return;
        }
      }
      
      console.log('Existing profile:', existingProfile);
      
      // Prepare profile data
      const profileData = {
        id: user.id, // This is critical - the primary key
        user_id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || 'Student',
        bio: editableProfile.bio,
        interests: editableProfile.interests,
        updated_at: new Date().toISOString()
      };
      
      console.log('Attempting to save profile data:', profileData);
      
      // If profile exists, update it; otherwise insert a new one
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .upsert(profileData, { 
          returning: 'minimal', 
          onConflict: 'id' 
        });
        
      if (error) {
        console.error('Error updating profile:', error);
        console.log('Error details:', error.details, error.hint, error.message);
        alert(`Failed to save profile: ${error.message}`);
        setIsLoading(false);
        return;
      }
      
      console.log('Profile updated successfully:', updatedProfile);
      
      // Update local state
      setUserProfile({ ...editableProfile });
      setIsEditing(false);
      setNewInterest('');
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Unexpected error saving profile:', err);
      alert(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditableProfile({
      ...editableProfile,
      [e.target.name]: e.target.value
    });
  };
  
  const handleAddInterest = () => {
    if (newInterest.trim() === '') return;
    
    setEditableProfile({
      ...editableProfile,
      interests: [...editableProfile.interests, newInterest.trim()]
    });
    
    setNewInterest('');
  };
  
  const handleRemoveInterest = (index: number) => {
    const newInterests = [...editableProfile.interests];
    newInterests.splice(index, 1);
    
    setEditableProfile({
      ...editableProfile,
      interests: newInterests
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div 
          style={{
            backgroundColor: 'var(--background-lighter)',
            borderRadius: '1rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
            border: '1px solid var(--border)'
          }}
        >
          {/* Profile Header */}
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '2rem',
              position: 'relative',
              backgroundImage: 'linear-gradient(to right, var(--primary), var(--secondary))',
              color: 'white'
            }}
          >
            <div 
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '4px solid white'
              }}
            >
              <User size={60} color="var(--primary)" />
            </div>
            
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {userProfile.name}
            </h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Mail size={16} />
              <span>{userProfile.email}</span>
            </div>
            
            <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
              <button
                onClick={handleSignOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                <LogOut size={18} />
                <span>{t('profile.signOut', 'Sign Out')}</span>
              </button>
            </div>
          </div>
          
          {/* Profile Body */}
          <div style={{ padding: '2rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {t('profile.about', 'About Me')}
              </h2>
              
              {!isEditing ? (
                <button
                  onClick={startEditing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  <Edit size={16} />
                  <span>{t('profile.edit', 'Edit Profile')}</span>
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={cancelEditing}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.375rem',
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} />
                    <span>{t('profile.cancel', 'Cancel')}</span>
                  </button>
                  
                  <button
                    onClick={saveChanges}
                    disabled={isLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.375rem',
                      backgroundColor: 'var(--primary)',
                      border: '1px solid var(--primary)',
                      color: 'white',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.7 : 1,
                    }}
                  >
                    {isLoading ? (
                      <div className="spinner-border" style={{ width: '16px', height: '16px' }} />
                    ) : (
                      <Save size={16} />
                    )}
                    <span>{t('profile.save', 'Save')}</span>
                  </button>
                </div>
              )}
            </div>
            
            {!isEditing ? (
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ lineHeight: '1.6', color: 'var(--text)' }}>
                  {userProfile.bio}
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: '2rem' }}>
                <textarea
                  name="bio"
                  value={editableProfile.bio}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--text)',
                    minHeight: '100px',
                  }}
                />
              </div>
            )}
            
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 'bold', 
              marginBottom: '1rem',
              color: 'var(--text)'
            }}>
              {t('profile.interests', 'Interests')}
            </h3>
            
            {!isEditing ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
                {userProfile.interests.map((interest, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {interest}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {editableProfile.interests.map((interest, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '9999px',
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      {interest}
                      <button
                        onClick={() => handleRemoveInterest(index)}
                        style={{
                          display: 'inline-flex',
                          padding: '2px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--border)',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem',
                  marginTop: '1rem' 
                }}>
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder={t('profile.addInterest', 'Add interest...')}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--text)',
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddInterest();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddInterest}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.375rem',
                      backgroundColor: 'var(--primary)',
                      border: '1px solid var(--primary)',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={16} />
                    <span>{t('profile.add', 'Add')}</span>
                  </button>
                </div>
              </div>
            )}
            
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 'bold', 
                marginBottom: '1rem',
                color: 'var(--text)'
              }}>
                {t('profile.achievements', 'Recent Achievements')}
              </h3>
              
              <div style={{ 
                backgroundColor: 'var(--background)',
                borderRadius: '0.5rem',
                padding: '1rem',
                border: '1px solid var(--border)',
              }}>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                  {t('profile.noAchievements', 'Complete quizzes and challenges to earn achievements')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile; 