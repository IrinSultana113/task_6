module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :nickname

    def connect
      self.nickname = find_nickname
    end

    private

    def find_nickname
      name = request.session[:nickname].presence || cookies.signed[:nickname]
      name = name.to_s.strip
      reject_unauthorized_connection if name.blank?
      name
    end

  end
end
