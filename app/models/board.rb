class Board < ApplicationRecord
  has_many :strokes, dependent: :destroy

  validates :name, presence: true, length: { maximum: 80 }
  validates :slug, presence: true, uniqueness: true
  validates :creator_nickname, presence: true, length: { maximum: 40 }

  before_validation :ensure_slug, on: :create
  before_create :set_last_activity

  scope :recent, -> { order(Arel.sql("COALESCE(last_activity_at, created_at) DESC")) }

  def to_param
    slug
  end

  def touch_activity!
    update_column(:last_activity_at, Time.current)
  end

  def stroke_payload
    strokes.order(:created_at).map(&:as_broadcast)
  end

  private

  def ensure_slug
    return if slug.present?

    base = name.to_s.parameterize.presence || "board"
    candidate = "#{base}-#{SecureRandom.alphanumeric(6).downcase}"
    candidate = "#{base}-#{SecureRandom.alphanumeric(6).downcase}" while Board.exists?(slug: candidate)
    self.slug = candidate
  end

  def set_last_activity
    self.last_activity_at ||= Time.current
  end
end
