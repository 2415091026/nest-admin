import request from '@/utils/request'

// 查询歌曲列表
export function listSong(query) {
  return request({
    url: '/music/song/list',
    method: 'get',
    params: query
  })
}

// 查询歌曲详细
export function getSong(id) {
  return request({
    url: '/music/song/' + id,
    method: 'get'
  })
}

// 新增歌曲
export function addSong(data) {
  return request({
    url: '/music/song',
    method: 'post',
    data: data
  })
}

// 修改歌曲
export function updateSong(data) {
  return request({
    url: '/music/song',
    method: 'put',
    data: data
  })
}

// 删除歌曲
export function delSong(id) {
  return request({
    url: '/music/song/' + id,
    method: 'delete'
  })
}
