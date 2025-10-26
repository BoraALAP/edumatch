/**
 * School Registration API
 *
 * Creates a new school and school admin profile.
 * Called after admin authentication is complete.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      schoolName,
      adminEmail,
      maxStudents,
      // Personal info
      firstName,
      lastName,
      age,
      bio,
      proficiencyLevel,
      interests,
      avatarUrl
    } = body;

    // Validate input
    if (!schoolName || !adminEmail || !maxStudents || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const seats = parseInt(maxStudents);
    if (isNaN(seats) || seats < 1) {
      return NextResponse.json(
        { error: 'Invalid number of seats' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user and session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        {
          error: 'Not authenticated. Please ensure you are logged in.',
          details: userError?.message || 'No user session found'
        },
        { status: 401 }
      );
    }

    // Verify session exists (important for RLS)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      console.log('User exists but no session - this will cause RLS to fail');
      return NextResponse.json(
        {
          error: 'Session expired. Please log in again.',
          details: 'No active session found'
        },
        { status: 401 }
      );
    }

    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, school_id')
      .eq('id', user.id)
      .maybeSingle();

    // If profile already has a school, they've already completed registration
    if (existingProfile?.school_id) {
      return NextResponse.json(
        { error: 'School already registered for this account.' },
        { status: 400 }
      );
    }

    // Create school record using admin client to bypass RLS
    // This is secure because:
    // 1. We've verified the user is authenticated above
    // 2. We've verified they have a valid session
    // 3. This is an administrative operation
    // 4. The user becomes the school admin immediately via profiles table
    // 5. All subsequent operations use regular RLS policies
    const adminClient = createAdminClient();
    const fullName = `${firstName} ${lastName}`;

    const { data: school, error: schoolError } = await adminClient
      .from('schools')
      .insert({
        name: schoolName,
        admin_email: adminEmail,
        admin_name: fullName,
        max_students: seats,
        is_active: true,
        allow_global_matching: false,
        invitation_settings: {
          require_approval: false,
          auto_accept_domain: false,
          allowed_domains: [],
        },
      })
      .select()
      .single();

    if (schoolError) {
      console.error('Error creating school:', schoolError);
      return NextResponse.json(
        { error: 'Failed to create school', details: schoolError.message },
        { status: 500 }
      );
    }

    // Update or create school admin profile
    const profileData = {
      role: 'school_admin',
      first_name: firstName,
      last_name: lastName,
      display_name: firstName,
      full_name: fullName,
      school_id: school.id,
      onboarding_completed: true,
      proficiency_level: proficiencyLevel || 'C1',
      age: age || null,
      bio: bio || null,
      avatar_url: avatarUrl || null,
      interests: interests && interests.length > 0 ? interests : ['Education', 'Teaching'],
      learning_goals: ['Manage school', 'Support students'],
      allow_global_matching: false,
    };

    const { error: profileError } = existingProfile
      ? await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id)
      : await supabase
          .from('profiles')
          .insert({
            id: user.id,
            ...profileData,
          });

    if (profileError) {
      console.error('Error creating admin profile:', profileError);

      // Try to clean up the school record using admin client
      await adminClient.from('schools').delete().eq('id', school.id);

      return NextResponse.json(
        { error: 'Failed to create admin profile', details: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      school: {
        id: school.id,
        name: school.name,
        maxStudents: school.max_students,
      },
    });
  } catch (error) {
    console.error('School registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
