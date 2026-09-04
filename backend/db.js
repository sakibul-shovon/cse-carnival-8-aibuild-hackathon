import sql from 'mssql'
import windowsSql from 'mssql/msnodesqlv8.js'
import 'dotenv/config'

const isWindowsAuthentication = process.env.DB_AUTHENTICATION === 'windows'
const databaseClient = isWindowsAuthentication ? windowsSql : sql
const config = isWindowsAuthentication
  ? {
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      driver: 'msnodesqlv8',
      connectionString: [
        'Driver={ODBC Driver 18 for SQL Server}',
        `Server=${process.env.DB_SERVER}`,
        `Database=${process.env.DB_NAME}`,
        'Trusted_Connection=Yes',
        'Encrypt=No',
        'TrustServerCertificate=Yes',
      ].join(';'),
      options: {
        trustedConnection: true,
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
      },
    }
  : {
      server: process.env.DB_SERVER,
      port: Number(process.env.DB_PORT ?? 1433),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
      },
    }

let poolPromise
export function getDbPool() {
  if (!poolPromise) {
    poolPromise = databaseClient.connect(config).catch((error) => {
      poolPromise = undefined
      const formatDetail = (value) => typeof value === 'string' ? value : JSON.stringify(value)
      const details = [
        error?.message,
        error?.code,
        error?.originalError?.message,
        error?.originalError?.code,
      ].filter(Boolean).map(formatDetail).join(' | ')
      throw new Error(`CampusOS SQL Server connection failed: ${details || formatDetail(error)}`)
    })
  }
  return poolPromise
}

export async function testConnection() {
  const pool = await getDbPool()
  await pool.request().query('SELECT 1 AS connected')
  return true
}

export { databaseClient as sql }
