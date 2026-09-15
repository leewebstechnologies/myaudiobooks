import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

// Validation schema for user registration
const registerSchema = z.object({
  fullName: z
    .string()
    .min(3, { message: "Full name must be at least 2 characters long" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 2 characters long" }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if the user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: validatedData.email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 },
      );
    }

    // Hash the password before storing it in the database
    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        fullName: validatedData.fullName,
        email: validatedData.email,
        passwordHash,
        role: "USER", // Default role for new users
        subscriptionTier: "FREE", // Default subscription for new users
        subscriptionStatus: "ACTIVE", // Default subscription status for new users
      },

      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        subscriptionTier: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: newUser,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    console.error("Error registering user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
