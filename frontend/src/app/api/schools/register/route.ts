/**
 * School Registration API
 *
 * Creates a new school and school admin profile.
 * Called after admin authentication is complete.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolName, adminName, adminEmail, maxStudents } = body;

    // Validate input
    if (!schoolName || !adminName || !adminEmail || !maxStudents) {
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

    // Get authenticated user
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

    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, school_id')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Account already has a profile. Please contact support.' },
        { status: 400 }
      );
    }

    // Create school record
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: schoolName,
        admin_email: adminEmail,
        admin_name: adminName,
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

    // Create school admin profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        role: 'school_admin',
        display_name: adminName.split(' ')[0], // First name
        full_name: adminName,
        school_id: school.id,
        onboarding_completed: true,
        proficiency_level: 'C1', // Default for admin
        interests: ['Education', 'Teaching'],
        learning_goals: ['Manage school', 'Support students'],
        allow_global_matching: false,
      });

    if (profileError) {
      console.error('Error creating admin profile:', profileError);

      // Try to clean up the school record
      await supabase.from('schools').delete().eq('id', school.id);

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
