import asyncio
import asyncmy

async def main():
    conn = await asyncmy.connect(
        host='gateway01.eu-central-1.prod.aws.tidbcloud.com',
        port=4000,
        user='4B4X2sssnr2H3GZ.root',
        password='1TA80QExBBnppdqc',
        database='test',
        ssl={'ca': '/etc/ssl/certs/ca-certificates.crt'}
    )
    async with conn.cursor() as cur:
        await cur.execute('CREATE DATABASE IF NOT EXISTS chama_yetu_pamoja')
        print("DB CREATED")
    await conn.ensure_closed()

asyncio.run(main())
