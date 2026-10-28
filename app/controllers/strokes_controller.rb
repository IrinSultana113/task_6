class StrokesController < ApplicationController
  before_action :require_nickname!
  before_action :set_board

  def create
    stroke = @board.strokes.build(stroke_params)
    stroke.nickname = current_nickname

    if stroke.save
      render json: { ok: true, stroke: stroke.as_broadcast }, status: :created
    else
      render json: { ok: false, errors: stroke.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_board
    @board = Board.find_by!(slug: params[:board_id])
  end

  def stroke_params
    permitted = params.require(:stroke).permit(:tool, :color, :width, :client_id, points: %i[x y])
    if permitted[:points].present?
      permitted[:points] = permitted[:points].map { |point| { "x" => point[:x].to_f, "y" => point[:y].to_f } }
    end
    permitted
  end
end
