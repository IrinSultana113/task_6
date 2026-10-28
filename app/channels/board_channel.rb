class BoardChannel < ApplicationCable::Channel
  def subscribed
    @board = Board.find_by(slug: params[:board_id])
    reject and return unless @board

    stream_for @board
    transmit({ type: "presence_self", nickname: nickname })
    BoardChannel.broadcast_to(@board, { type: "join", nickname: nickname })
  end

  def unsubscribed
    return unless @board

    BoardChannel.broadcast_to(@board, { type: "leave", nickname: nickname })
  end

  def draw(data)
    return unless @board

    BoardChannel.broadcast_to(
      @board,
      {
        type: "live",
        nickname: nickname,
        client_id: data["client_id"],
        tool: data["tool"],
        color: data["color"],
        width: data["width"],
        points: data["points"]
      }
    )
  end

  def cursor(data)
    return unless @board

    BoardChannel.broadcast_to(
      @board,
      {
        type: "cursor",
        nickname: nickname,
        x: data["x"],
        y: data["y"],
        color: data["color"]
      }
    )
  end
end
