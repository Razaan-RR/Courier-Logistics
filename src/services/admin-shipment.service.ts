import { api } from '@/lib/api'

type ShipmentListParams = {
  page?: number
  limit?: number
  status?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'deliveryCharge' | 'weight'
  sortOrder?: 'asc' | 'desc'
}

export const getAdminShipments = async (params?: ShipmentListParams) => {
  const response = await api.get('/admin/shipments', { params })
  return response.data.data
}

export const getReadyForAssignment = async (params?: ShipmentListParams) => {
  const response = await api.get('/admin/shipments/ready-for-assignment', {
    params,
  })
  return response.data.data
}

export const getAdminCouriers = async () => {
  const response = await api.get('/admin/couriers')
  return response.data.data
}

export const assignShipmentToCourier = async (
  shipmentId: string,
  courierId: string,
) => {
  const response = await api.post(`/shipments/${shipmentId}/assign`, {
    courierId,
  })
  return response.data.data
}

export const getPaidShipments = async (params?: ShipmentListParams) => {
  const response = await api.get('/admin/shipments', {
    params: { ...params, status: 'PAID' },
  })
  return response.data.data
}

export const makeReadyForAssignment = async (shipmentId: string) => {
  const response = await api.post(
    `/shipments/${shipmentId}/ready-for-assignment`,
  )
  return response.data.data
}