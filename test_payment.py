import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # First try to login
        res = await client.post("http://localhost:8002/api/auth/test-login") # Assuming there might be a test route
        print("Login status:", res.status_code)
        
        # Or let's see what users are in the DB.
main()
