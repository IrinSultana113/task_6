class Stroke < ApplicationRecord
  TOOLS = %w[pen eraser line rect ellipse].freeze

  belongs_to :board, counter_cache: true

  validates :tool, inclusion: { in: TOOLS }
  validates :color, presence: true
  validates :width, numericality: { greater_than: 0, less_than_or_equal_to: 80 }
  validates :points, presence: true
  validates :nickname, presence: true, length: { maximum: 40 }

  after_create_commit :broadcast_and_touch

  def as_broadcast
    {
      id: id,
      tool: tool,
      color: color,
      width: width,
      points: points,
      nickname: nickname,
      client_id: client_id
    }
  end

  private

  def broadcast_and_touch
    board.touch_activity!
    BoardChannel.broadcast_to(board, { type: "stroke", stroke: as_broadcast })
  end
end
