class BoardsController < ApplicationController
  before_action :require_nickname!
  before_action :set_board, only: :show

  def index
    @boards = Board.recent.limit(48)
    @board = Board.new
  end

  def create
    @board = Board.new(board_params)
    @board.creator_nickname = current_nickname

    if @board.save
      redirect_to @board
    else
      @boards = Board.recent.limit(48)
      flash.now[:alert] = @board.errors.full_messages.to_sentence
      render :index, status: :unprocessable_entity
    end
  end

  def show
    @strokes = @board.stroke_payload
  end

  private

  def set_board
    @board = Board.find_by!(slug: params[:id])
  end

  def board_params
    params.require(:board).permit(:name)
  end
end
