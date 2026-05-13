export interface Tenant {
  id: string
  name: string
  slug: string
  cnpj?: string
  plan_id?: string
  status: 'active' | 'suspended' | 'cancelled'
  subscription_start?: string
  subscription_end?: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  tenant_id: string
  full_name: string
  email: string
  role: 'admin' | 'auditor' | 'viewer'
  avatar_url?: string
  is_active: boolean
  last_login?: string
  must_change_password: boolean
  created_at: string
  updated_at: string
}

export interface SapSystem {
  id: string
  tenant_id: string
  name: string
  system_id: string
  description?: string
  client_number?: string
  landscape: 'production' | 'quality' | 'development' | 'sandbox'
  version?: string
  connection_host?: string
  connection_port?: string
  is_active: boolean
  last_sync?: string
  sync_status: 'pending' | 'syncing' | 'success' | 'error'
  created_at: string
  updated_at: string
}

export interface LicenseType {
  id: string
  tenant_id: string
  sap_system_id: string
  name: string
  sap_code?: string
  description?: string
  unit_cost?: number
  currency: string
  contracted_quantity: number
  created_at: string
  updated_at: string
}

export interface SapUser {
  id: string
  tenant_id: string
  sap_system_id: string
  sap_username: string
  full_name?: string
  email?: string
  department?: string
  cost_center?: string
  user_type?: string
  license_type_id?: string
  validity_start?: string
  validity_end?: string
  last_login?: string
  login_count: number
  is_locked: boolean
  is_active: boolean
  created_in_sap?: string
  raw_data: Record<string, unknown>
  created_at: string
  updated_at: string
  license_type?: LicenseType
}

export interface Audit {
  id: string
  tenant_id: string
  sap_system_id: string
  name: string
  description?: string
  audit_date: string
  period_start: string
  period_end: string
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'cancelled'
  total_users: number
  active_users: number
  inactive_users: number
  licensed_users: number
  unlicensed_users: number
  over_licensed: number
  under_licensed: number
  potential_savings: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  findings: unknown[]
  recommendations: unknown[]
  created_by?: string
  reviewed_by?: string
  completed_at?: string
  created_at: string
  updated_at: string
  sap_system?: SapSystem
}

export interface AuditFinding {
  id: string
  tenant_id: string
  audit_id: string
  sap_user_id?: string
  finding_type: 
    | 'inactive_licensed'
    | 'wrong_license_type'
    | 'duplicate_user'
    | 'expired_validity'
    | 'over_privileged'
    | 'missing_license'
    | 'shared_user'
    | 'test_user_production'
    | 'excessive_authorizations'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  recommendation?: string
  estimated_saving: number
  status: 'open' | 'acknowledged' | 'resolved' | 'accepted_risk'
  resolved_at?: string
  resolved_by?: string
  notes?: string
  created_at: string
  updated_at: string
  sap_user?: SapUser
}

export interface LicenseContract {
  id: string
  tenant_id: string
  sap_system_id: string
  contract_number?: string
  vendor: string
  start_date: string
  end_date?: string
  auto_renewal: boolean
  total_value?: number
  currency: string
  license_details: Array<{
    type: string
    quantity: number
    unit_price: number
  }>
  notes?: string
  document_url?: string
  status: 'active' | 'expired' | 'cancelled' | 'pending_renewal'
  created_at: string
  updated_at: string
  sap_system?: SapSystem
}

export interface DataImport {
  id: string
  tenant_id: string
  sap_system_id: string
  import_type: 'users' | 'roles' | 'transactions' | 'license_data' | 'full'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  file_name?: string
  file_size?: number
  records_total: number
  records_processed: number
  records_failed: number
  error_log: unknown[]
  started_at?: string
  completed_at?: string
  created_by?: string
  created_at: string
}

export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  totalLicenses: number
  usedLicenses: number
  openFindings: number
  criticalFindings: number
  potentialSavings: number
  complianceScore: number
  totalSystems: number
  auditsThisYear: number
}
