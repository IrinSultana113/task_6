class SessionsController < ApplicationController
  def new
    redirect_to boards_path if nickname?
  end

  def create
    nickname = params.require(:nickname).to_s.strip
    if nickname.blank? || nickname.length > 40
      flash.now[:alert] = "Nickname must be 1–40 characters."
      render :new, status: :unprocessable_entity
      return
    end

    session[:nickname] = nickname
    cookies.signed[:nickname] = { value: nickname, expires: 1.year.from_now }
    destination = session.delete(:return_to).presence || boards_path
    redirect_to destination
  end

  def destroy
    cookies.delete(:nickname)
    reset_session
    redirect_to root_path
  end
end

