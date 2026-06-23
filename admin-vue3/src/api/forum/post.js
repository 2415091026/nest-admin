import request from '@/utils/request'

// 查询帖子列表
export function listPost(query) {
  return request({
    url: '/forum/post/list',
    method: 'get',
    params: query
  })
}

// 查询帖子详细
export function getPost(postId) {
  return request({
    url: `/forum/post/${postId}`,
    method: 'get'
  })
}

// 新增帖子
export function addPost(data) {
  return request({
    url: '/forum/post',
    method: 'post',
    data: data
  })
}

// 修改帖子
export function updatePost(data) {
  return request({
    url: '/forum/post',
    method: 'put',
    data: data
  })
}

// 删除帖子
export function delPost(ids) {
  return request({
    url: `/forum/post/${ids}`,
    method: 'delete'
  })
}

// 审核/复核帖子申诉
export function handleAppeal(data) {
  return request({
    url: '/forum/post/appeal/handle',
    method: 'put',
    data: data
  })
}
