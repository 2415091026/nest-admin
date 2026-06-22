import request from '@/utils/request'

// 查询帖子举报列表
export function listReport(query) {
  return request({
    url: '/forum/post/report/list',
    method: 'get',
    params: query
  })
}

// 处理帖子举报状态
export function handleReport(data) {
  return request({
    url: '/forum/post/report/handle',
    method: 'put',
    data: data
  })
}
