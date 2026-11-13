import { api } from '@/lib/api'

export const getCourierAssignedShipments = async () => {
  const response = await api.get('/shipments/courier/assigned')
  return response.data.data
}

export const getCourierActiveShipments = async () => {
  const response = await api.get('/shipments/courier/active')
  return response.data.data
}

export const getCourierCompletedShipments = async () => {
  const response = await api.get('/shipments/courier/completed')
  return response.data.data
}

export const getCourierShipment = async (shipmentId: string) => {
  const response = await api.get(`/shipments/courier/${shipmentId}`)
  return response.data.data
}

export const getCourierShipmentHistory = async (shipmentId: string) => {
  const response = await api.get(`/shipments/courier/${shipmentId}/history`)
  return response.data.data
}

export const acceptShipment = async (shipmentId: string) => {
  const response = await api.post(`/shipments/${shipmentId}/accept`)
  return response.data.data
}

export const pickupShipment = async (shipmentId: string) => {
  const response = await api.post(`/shipments/${shipmentId}/pickup`)
  return response.data.data
}

export const markShipmentInTransit = async (shipmentId: string) => {
  const response = await api.post(`/shipments/${shipmentId}/in-transit`)
  return response.data.data
}

export const markShipmentOutForDelivery = async (shipmentId: string) => {
  const response = await api.post(`/shipments/${shipmentId}/out-for-delivery`)
  return response.data.data
}

export const deliverShipment = async (shipmentId: string) => {
  const response = await api.post(`/shipments/${shipmentId}/deliver`)
  return response.data.data
}

export const markShipmentDeliveryFailed = async (shipmentId: string) => {
  const response = await api.post(`/shipments/${shipmentId}/delivery-failed`)
  return response.data.data
}

export const returnShipment = async (shipmentId: string) => {
  const response = await api.post(`/shipments/${shipmentId}/return`)
  return response.data.data
}
