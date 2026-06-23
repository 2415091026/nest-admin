import request from '@/utils/request'

// 发布全员系统消息
export function sendSystemMessage(data) {
  return request({
    url: '/system/message/create',
    method: 'post',
    data: data
  })
}

// 查询系统消息列表 (全员广播消息)
export function listSystemMessages(query) {
  return request({
    url: '/system/message/list',
    method: 'get',
    params: query
  })
}
