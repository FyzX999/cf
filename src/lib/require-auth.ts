import { NextResponse } from "next/server";
import { getAuthUser } from "./supabase-server";
import { isAdminRequest } from "./require-admin";
import { createServiceSupabase } from "./supabase";

/**
 * Authentication result that includes user information
 */
export interface AuthResult {
  user: { id: string };
  isAdmin: boolean;
}

/**
 * Authorization options for requireAuth middleware
 */
export interface AuthOptions {
  /** If true, allow admin users to bypass ownership checks */
  allowAdmin?: boolean;
  /** Function to verify resource ownership */
  verifyOwnership?: (userId: string) => Promise<boolean>;
}

/**
 * Middleware function to verify user authentication and authorization
 * 
 * Requirements addressed:
 * - 6.1: Verify user authentication status
 * - 6.2: Redirect/return 401 for unauthenticated users
 * - 6.3: Verify requesting user owns the resource or is an admin
 * - 6.4: Return 403 Forbidden for unauthorized users
 * - 6.5: Check authentication before processing any request
 * 
 * @param options - Optional authorization configuration
 * @returns AuthResult if authenticated and authorized, NextResponse with error if not
 * 
 * @example
 * ```typescript
 * // Simple authentication check
 * const authResult = await requireAuth();
 * if (authResult instanceof NextResponse) {
 *   return authResult; // Return 401 error
 * }
 * 
 * // Authentication with ownership verification
 * const authResult = await requireAuth({
 *   allowAdmin: true,
 *   verifyOwnership: async (userId) => {
 *     const order = await getOrder(orderId);
 *     return order.user_id === userId;
 *   }
 * });
 * if (authResult instanceof NextResponse) {
 *   return authResult; // Return 401 or 403 error
 * }
 * ```
 */
export async function requireAuth(
  options?: AuthOptions
): Promise<AuthResult | NextResponse> {
  // Step 1: Check if user is authenticated
  // Requirement 6.1: Verify user authentication status
  const user = await getAuthUser();
  const isAdmin = await isAdminRequest();

  // Requirement 6.2: Return 401 for unauthenticated requests
  if (!user && !isAdmin) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // If no ownership verification is needed, return success
  if (!options?.verifyOwnership) {
    return {
      user: user as { id: string },
      isAdmin,
    };
  }

  // Step 2: Verify authorization (ownership or admin)
  // Requirement 6.3: Verify requesting user owns the resource or is an admin
  if (isAdmin && options.allowAdmin !== false) {
    // Admins bypass ownership checks by default
    return {
      user: user as { id: string },
      isAdmin,
    };
  }

  // If user is not authenticated, we can't verify ownership
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // Verify ownership
  const isOwner = await options.verifyOwnership(user.id);

  // Requirement 6.4: Return 403 Forbidden for unauthorized users
  if (!isOwner) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  // User is authenticated and authorized
  return {
    user: user as { id: string },
    isAdmin,
  };
}

/**
 * Verify order ownership for the authenticated user
 * 
 * @param orderId - Public ID of the order (e.g., "CF123456")
 * @param userId - User ID to check ownership against
 * @returns true if user owns the order, false otherwise
 */
export async function verifyOrderOwnership(
  orderId: string,
  userId: string
): Promise<boolean> {
  const db = createServiceSupabase();
  if (!db) {
    return false;
  }

  const { data } = await db
    .from("orders")
    .select("user_id")
    .eq("public_id", orderId)
    .maybeSingle();

  return data?.user_id === userId;
}
