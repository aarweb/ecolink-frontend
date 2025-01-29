import { Component, OnInit } from '@angular/core';
import { PostService } from '../../services/PostService.service';
import { Post } from '../../models/Post';

@Component({
  selector: 'home-posts',
  templateUrl: './posts.component.html',
  styleUrl: './posts.component.scss'
})
export class PostsComponent implements OnInit {
  posts: Post[] = [];
  constructor(private postService: PostService) { }

  ngOnInit(): void {
    this.postService.getRecentPosts().subscribe(posts => {
      this.posts = posts;
    });
  }
}
