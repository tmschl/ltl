import jwt from "jsonwebtoken"
import { prisma } from "./prisma"

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "your-secret-key"

export interface User {
  id: string
  email: string
  name?: string | null
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    return user
  } catch (error) {
    return null
  }
}

export function createToken(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  )
}

export async function getAuthenticatedUser(request: Request): Promise<User | null> {
  try {
    const token = request.headers.get("cookie")?.split("auth-token=")[1]?.split(";")[0]
    
    if (!token) {
      return null
    }
    
    return await verifyToken(token)
  } catch (error) {
    return null
  }
}
