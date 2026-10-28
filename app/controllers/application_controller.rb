class ApplicationController < ActionController::Base
  allow_browser versions: :modern
  stale_when_importmap_changes

  helper_method :current_nickname, :nickname?

  private

  def current_nickname
    session[:nickname]
  end

  def nickname?
    current_nickname.present?
  end

  def require_nickname!
    return if nickname?

    session[:return_to] = request.fullpath if request.get?
    redirect_to root_path, alert: "Pick a nickname to continue."
  end
end
