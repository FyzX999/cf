'use client';

import { Star } from '@phosphor-icons/react';

interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  service?: string;
  date: string;
}

const featuredReviews: Review[] = [
  {
    id: '1',
    author: 'Sarah M.',
    rating: 5,
    text: 'Incredible service! Orders are processed instantly and the quality is top-notch. Been using for 6 months now.',
    service: 'Instagram Followers',
    date: '2026-08-15'
  },
  {
    id: '2',
    author: 'Mike R.',
    rating: 5,
    text: 'Best SMM panel I\'ve used. Fast delivery, great prices, and excellent customer support. Highly recommend!',
    service: 'YouTube Views',
    date: '2026-08-20'
  },
  {
    id: '3',
    author: 'Jessica L.',
    rating: 5,
    text: 'Professional service with real results. The wallet system makes it easy to manage multiple orders.',
    service: 'TikTok Likes',
    date: '2026-08-25'
  },
  {
    id: '4',
    author: 'David K.',
    rating: 5,
    text: 'Perfect for agencies! The API is well-documented and the reseller discount is generous.',
    service: 'Twitter Followers',
    date: '2026-08-28'
  },
  {
    id: '5',
    author: 'Emma W.',
    rating: 5,
    text: 'Lightning-fast delivery and affordable prices. Customer support is responsive and helpful.',
    service: 'Instagram Likes',
    date: '2026-09-01'
  },
  {
    id: '6',
    author: 'James T.',
    rating: 5,
    text: 'Been using this for my clients and they love the results. Reliable and consistent quality.',
    service: 'Facebook Page Likes',
    date: '2026-09-03'
  }
];

export function ReviewsShowcase() {
  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-3">Trusted by thousands</h2>
        <p className="text-[#9aa3b5] max-w-2xl mx-auto">
          See what our customers have to say about their experience
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {featuredReviews.map((review) => (
          <div key={review.id} className="glass rounded-lg p-6 hover:border-white/20 transition-colors">
            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  weight="fill"
                  className={i < review.rating ? 'text-yellow-400' : 'text-gray-600'}
                />
              ))}
            </div>
            
            <p className="text-sm leading-relaxed mb-4">
              "{review.text}"
            </p>
            
            <div className="flex items-center justify-between text-xs text-[#9aa3b5]">
              <span className="font-medium">{review.author}</span>
              {review.service && (
                <span className="text-blue-400">{review.service}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-8">
        <p className="text-sm text-[#9aa3b5]">
          ⭐ 4.9/5 average rating from 2,000+ reviews
        </p>
      </div>
    </section>
  );
}