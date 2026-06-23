import request from '@/utils/request'

// 查询板块分类列表
export function listCategory(query) {
  return request({
    url: '/forum/category/list',
    method: 'get',
    params: query
  })
}

// 新增板块分类
export function addCategory(data) {
  return request({
    url: '/forum/category',
    method: 'post',
    data: data
  })
}

// 修改板块分类
export function updateCategory(data) {
  return request({
    url: '/forum/category',
    method: 'put',
    data: data
  })
}

// 删除板块分类
export function delCategory(ids) {
  return request({
    url: `/forum/category/${ids}`,
    method: 'delete'
  })
}
