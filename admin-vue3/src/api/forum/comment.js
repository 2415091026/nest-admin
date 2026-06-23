import request from '@/utils/request'

// 获取指定帖子下的评论树列表
export function listComment(postId) {
  return request({
    url: `/forum/comment/list/${postId}`,
    method: 'get'
  })
}

// 删除评论
export function delComment(commentId) {
  return request({
    url: `/forum/comment/${commentId}`,
    method: 'delete'
  })
}
